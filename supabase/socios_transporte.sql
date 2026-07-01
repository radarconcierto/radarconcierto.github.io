-- ═══════════════════════════════════════════════════════════
--  MIGRACIÓN: campos de transporte en socios_radar
--  Ejecutar en: Supabase > SQL Editor
-- ═══════════════════════════════════════════════════════════

alter table public.socios_radar
  add column if not exists ciudad_salida  text,        -- ciudad desde donde sale el bus
  add column if not exists horario_salida text,        -- ej: "18:00 hrs"
  add column if not exists horario_regreso text,       -- ej: "00:30 hrs"
  add column if not exists precio         text,        -- ej: "$8.990 ida y vuelta"
  add column if not exists cupos          integer,     -- null = no mostrar
  add column if not exists contacto       text;        -- whatsapp, teléfono o URL de reserva
