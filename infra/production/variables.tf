variable "region" { type = string }
variable "project" { type = string }
variable "domain" { type = string }
variable "image_digest" {
  type = string
  validation {
    condition     = can(regex("^sha256:[0-9a-f]{64}$", var.image_digest))
    error_message = "Marketplace image must be pinned to an immutable digest."
  }
}
variable "ssm_path" {
  type = string
  validation {
    condition     = startswith(var.ssm_path, "/") && !endswith(var.ssm_path, "/")
    error_message = "Use a dedicated absolute SSM path without a trailing slash."
  }
}
variable "database_admin_parameter" {
  type    = string
  default = ""
}
variable "enable_service" {
  type    = bool
  default = false
}
variable "enable_dns_cutover" {
  type    = bool
  default = false
}

# Account-specific network references are reviewed production settings. This stack
# never reads another application's state or applies another application's stack.
variable "network" {
  type = object({
    vpc_id                 = string
    task_subnets           = list(string)
    rds_security_group_ids = list(string)
    alb_security_group_id  = string
    https_listener_arn     = string
    route53_zone_id        = string
    alb_dns_name           = string
    alb_zone_id            = string
  })
  validation {
    condition     = length(var.network.task_subnets) > 0 && length(var.network.rds_security_group_ids) > 0
    error_message = "Private task subnets and database security groups are required."
  }
}
variable "listener_priority" {
  type    = number
  default = 40
}
