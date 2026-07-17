CREATE INDEX "rides_driver_id_status_idx" ON "rides" USING btree ("driver_id","status");--> statement-breakpoint
CREATE INDEX "rides_passenger_id_status_idx" ON "rides" USING btree ("passenger_id","status");--> statement-breakpoint
CREATE INDEX "rides_status_idx" ON "rides" USING btree ("status");
