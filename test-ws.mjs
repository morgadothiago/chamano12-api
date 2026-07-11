import { io } from "socket.io-client";
import { execSync } from "child_process";

const API = "http://localhost:3000";
const DRIVER_EMAIL = "driver@test.com";

async function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// Setup
const adminLogin = await fetch(`${API}/api/v1/auth/login`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "admin@example.com", password: "admin123" }),
});
const adminToken = (await adminLogin.json()).data.token;
console.log("1. Admin autenticado");

const reg = await fetch(`${API}/api/v1/auth/register`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ nome: "Test Driver", email: DRIVER_EMAIL, password: "123456" }),
});
let dt, uid;
if (reg.ok) { const b=await reg.json(); dt=b.data.token; uid=b.data.user.id; }
else { const b=await (await fetch(`${API}/api/v1/auth/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:DRIVER_EMAIL,password:"123456"})})).json(); dt=b.data.token; uid=b.data.user.id; }
console.log("2. userId:", uid);

execSync(`psql -d chama12_dev -c "INSERT INTO drivers (id, user_id, nome, email, telefone, cnh, status, veiculo_modelo, veiculo_placa, veiculo_ano, endereco_cep, endereco_logradouro, endereco_numero, endereco_bairro, endereco_cidade, endereco_uf, created_at, updated_at) SELECT gen_random_uuid(), '${uid}', 'Test Driver', '${DRIVER_EMAIL}', '11999999999', '12345678900', 'ativo', 'Fiat Uno', 'ABC-1234', 2020, '01310-000', 'Rua Augusta', '1500', 'Consolação', 'São Paulo', 'SP', NOW(), NOW() WHERE NOT EXISTS (SELECT 1 FROM drivers WHERE email = '${DRIVER_EMAIL}')"`,{stdio:"pipe"});
console.log("3. Driver record ok\n");

// Cancel leftover rides
execSync(`psql -d chama12_dev -c "UPDATE rides SET status='cancelada', cancelada_em=NOW(), cancelado_por='sistema' WHERE status='solicitada'"`, {stdio:"pipe"});

// ── DRIVER ──
const driver = io(`${API}/ws`, { auth: { token: dt }, transports: ["websocket"] });

driver.on("connect", () => console.log("4. Motorista conectado"));
driver.on("driver:online-confirmed", () => console.log("   ✓ Online"));

// Listen for ALL events from server
driver.onAny((event, ...args) => {
  if (event.startsWith("ride:") || event === "exception" || event === "error") {
    console.log(`   [driver evt] ${event}`, JSON.stringify(args).slice(0, 150));
  }
});

let rideId;
driver.on("ride:new-request", (data) => {
  rideId = data.rideId;
  console.log(`\n🚗 NOVA CORRIDA: ${rideId} — R$ ${data.valor}`);

  // Accept after 800ms
  setTimeout(async () => {
    console.log("   → driver:accept-ride emitindo...");
    driver.emit("driver:accept-ride", { rideId });

    // Also try REST endpoint as fallback
    console.log("   → REST /rides/:id/accept chamando...");
    const acceptRes = await fetch(`${API}/api/v1/rides/${rideId}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${dt}` },
      body: JSON.stringify({ driverId: uid }),
    });
    const acceptBody = await acceptRes.json();
    console.log("   → REST resposta:", JSON.stringify(acceptBody).slice(0, 200));
  }, 800);
});

await new Promise(r => driver.on("connect", r));
await sleep(500);
driver.emit("driver:go-online", { lat: -23.5505, lng: -46.6333 });
await sleep(1000);

// ── PASSENGER ──
const pass = io(`${API}/ws`, { query: { deviceId: "test-" + Date.now() }, transports: ["websocket"] });

pass.onAny((event, ...args) => {
  if (event.startsWith("ride:") || event === "exception" || event === "error") {
    console.log(`   [pass evt] ${event}`, JSON.stringify(args).slice(0, 200));
  }
});

pass.on("connect", () => console.log("\n5. Passageiro conectado"));
pass.on("ride:searching-drivers", (d) => console.log("   ✓ Buscando,", d.driversNotified, "notificados"));

pass.on("ride:accepted", (data) => {
  console.log("\n✅ CORRIDA ACEITA! Motorista:", data.driverName);
  console.log("   → Iniciando...");
  driver.emit("driver:start-ride", { rideId });
});

pass.on("ride:started", async (data) => {
  console.log("\n✅ CORRIDA INICIADA!");
  for (let i = 0; i < 3; i++) {
    await sleep(500);
    driver.emit("driver:location-update", { lat: -23.5505 + i * 0.001, lng: -46.6333 + i * 0.001 });
  }
  console.log("   → Completando...");
  driver.emit("driver:complete-ride", { rideId });
});

pass.on("ride:completed", () => {
  console.log("\n✅ CORRIDA FINALIZADA! FLUXO COMPLETO!");
  driver.emit("driver:go-offline");
  driver.disconnect();
  pass.disconnect();
  process.exit(0);
});

pass.on("ride:no-drivers-nearby", (d) => console.log("   ✗ Sem motoristas:", d.message));
pass.on("ride:timed-out", () => console.log("   ⏱ Timeout"));
pass.on("error", (e) => console.error("Pass error:", e));

await new Promise(r => pass.on("connect", r));
await sleep(500);

console.log("   Solicitando corrida via WS...");
pass.emit("passenger:request-ride", {
  passengerName: "João",
  origem: "Rua Augusta, 1500", origemLat: -23.5505, origemLng: -46.6333,
  destino: "Av. Paulista, 1000", destinoLat: -23.5610, destinoLng: -46.6560,
  distanciaKm: 3.5, valor: 12.5,
});

await sleep(40000);
console.log("\n⏱ Timeout final");
driver.disconnect();
pass.disconnect();
process.exit(1);
