-- 030: GTM Budget fields
-- Brand config: presupuesto anual + por trimestre
ALTER TABLE brand_config ADD COLUMN IF NOT EXISTS gtm_budget_annual DOUBLE PRECISION DEFAULT 0;
ALTER TABLE brand_config ADD COLUMN IF NOT EXISTS gtm_budget_q1 DOUBLE PRECISION DEFAULT 2600;
ALTER TABLE brand_config ADD COLUMN IF NOT EXISTS gtm_budget_q2 DOUBLE PRECISION DEFAULT 0;
ALTER TABLE brand_config ADD COLUMN IF NOT EXISTS gtm_budget_q3 DOUBLE PRECISION DEFAULT 0;
ALTER TABLE brand_config ADD COLUMN IF NOT EXISTS gtm_budget_q4 DOUBLE PRECISION DEFAULT 0;

-- Sales tactics: presupuesto mensual + gasto acumulado
ALTER TABLE sales_tactics ADD COLUMN IF NOT EXISTS budget_monthly DOUBLE PRECISION DEFAULT 0;
ALTER TABLE sales_tactics ADD COLUMN IF NOT EXISTS budget_spent DOUBLE PRECISION DEFAULT 0;
