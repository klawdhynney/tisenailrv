-- Migration: 0025_avaliacoes_completas_e_resumo_publico.sql
CREATE TABLE IF NOT EXISTS "avaliacoes_chamados" (
  "id" serial PRIMARY KEY NOT NULL,
  "ticket_id" integer NOT NULL REFERENCES "tickets"("id") ON DELETE CASCADE,
  "user_id" uuid,
  "user_email" text,
  "nota" integer NOT NULL,
  "comentario" text,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT "ticket_avaliacao_unica" UNIQUE("ticket_id")
);

CREATE INDEX IF NOT EXISTS "idx_avaliacoes_ticket_id" ON "avaliacoes_chamados" ("ticket_id");
CREATE INDEX IF NOT EXISTS "idx_avaliacoes_created_at" ON "avaliacoes_chamados" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_avaliacoes_nota" ON "avaliacoes_chamados" ("nota");
