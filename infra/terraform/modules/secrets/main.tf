# Creates SSM SecureString parameters for the given environment.
# Terraform creates the containers with placeholder values.
# ACTUAL SECRET VALUES must be set out-of-band (AWS Console or CLI):
#   aws ssm put-parameter --name "/taager/<env>/SECRET_KEY" --value "<val>" \
#     --type SecureString --overwrite
# The ignore_changes lifecycle prevents Terraform from resetting real values.

locals {
  path = "/taager/${var.environment}"

  # Parameters that hold placeholder text — real values set manually
  secret_params = toset([
    "SECRET_KEY",
    "TOKEN_ENCRYPTION_KEY",
    "DATABASE_URL",
    "META_APP_ID",
    "META_APP_SECRET",
    "META_REDIRECT_URI",
    "TIKTOK_APP_ID",
    "TIKTOK_APP_SECRET",
    "TIKTOK_REDIRECT_URI",
    "SNAPCHAT_CLIENT_ID",
    "SNAPCHAT_CLIENT_SECRET",
    "SNAPCHAT_REDIRECT_URI",
    "FRONTEND_ORIGIN",
  ])
}

resource "aws_ssm_parameter" "secrets" {
  for_each = local.secret_params

  name  = "${local.path}/${each.key}"
  type  = "SecureString"
  value = "PLACEHOLDER_SET_OUT_OF_BAND"

  lifecycle {
    # Never overwrite values that were set out-of-band
    ignore_changes = [value]
  }

  tags = {
    Project     = "taagerdash"
    Environment = var.environment
  }
}
