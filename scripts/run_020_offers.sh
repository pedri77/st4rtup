#!/bin/bash
# Execute offers migration on Fly.io Postgres
# Usage: bash scripts/run_020_offers.sh

cat scripts/020_offers_table.sql | fly postgres connect -a riskitera-postgres -d riskitera_sales
