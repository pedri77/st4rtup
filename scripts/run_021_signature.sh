#!/bin/bash
# Execute signature fields migration on Fly.io Postgres
# Usage: bash scripts/run_021_signature.sh

cat scripts/021_offer_signature_fields.sql | fly postgres connect -a riskitera-postgres -d riskitera_sales_backend
