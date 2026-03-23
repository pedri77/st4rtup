#!/bin/bash
# Execute invoice fields migration on Fly.io Postgres
# Usage: bash scripts/run_022_invoice.sh

cat scripts/022_offer_invoice_fields.sql | fly postgres connect -a riskitera-postgres -d riskitera_sales_backend
