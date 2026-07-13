export interface JwtPayload {
  sub: string; // user id
  email: string;
  name: string;
  role: string;
  sv: number; // sessionVersion vigente no momento da emissão — ver users.sessionVersion
}
