# Staging environment

Because staging and prod share a single EC2 t3.micro and RDS instance (to stay
within AWS free-tier limits), all infrastructure is managed from the **prod** env root:

    infra/terraform/envs/prod/

The prod root creates ECS services for both `prod` and `staging` environments,
two CloudFront distributions, and both sets of SSM parameters.

There is no separate staging Terraform state. Use the prod root for all `plan` / `apply`
operations.

To run Terraform:
    cd infra/terraform/envs/prod
    terraform plan -var-file=prod.tfvars
    terraform apply -var-file=prod.tfvars
