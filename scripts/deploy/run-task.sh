#!/usr/bin/env bash
# Run only this release's one-off task; fail closed and stop it on interruption.
set -euo pipefail
if [ "$#" -ne 5 ]; then
  echo 'usage: run-task.sh CLUSTER TASK_DEFINITION SUBNET_CSV SECURITY_GROUP TIMEOUT_SECONDS' >&2
  exit 2
fi
cluster=$1
definition=$2
subnets=$3
group=$4
timeout=$5
[[ "$subnets" =~ ^subnet-[a-f0-9]+(,subnet-[a-f0-9]+)*$ ]]
[[ "$group" =~ ^sg-[a-f0-9]+$ ]]
[[ "$timeout" =~ ^[0-9]+$ ]]
task=''
stopped=false
# ShellCheck cannot see the EXIT trap invocation; timeout/API-error tests exercise it.
# shellcheck disable=SC2317
cleanup() {
  if [ -n "$task" ] && [ "$stopped" != true ]; then
    aws ecs stop-task --cluster "$cluster" --task "$task" \
      --reason 'Marketplace release task interrupted or timed out' >/dev/null || true
  fi
}
trap 'cleanup' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
network=$(jq -nc --arg subnets "$subnets" --arg group "$group" \
  '{awsvpcConfiguration:{subnets:($subnets|split(",")),securityGroups:[$group],assignPublicIp:"DISABLED"}}')
result=$(aws ecs run-task --cluster "$cluster" --task-definition "$definition" \
  --launch-type FARGATE --network-configuration "$network" --count 1 \
  --cli-connect-timeout 10 --cli-read-timeout 30)
if ! jq -e '(.failures|length)==0 and (.tasks|length)==1' <<<"$result" >/dev/null; then
  jq -r '.failures[]?.reason // "ECS did not launch one task"' <<<"$result" >&2
  exit 1
fi
task=$(jq -er '.tasks[0].taskArn' <<<"$result")
deadline=$((SECONDS + timeout))
while [ "$SECONDS" -lt "$deadline" ]; do
  result=$(aws ecs describe-tasks --cluster "$cluster" --tasks "$task" \
    --cli-connect-timeout 10 --cli-read-timeout 30)
  jq -e '(.failures|length)==0 and (.tasks|length)==1' <<<"$result" >/dev/null
  if [ "$(jq -r '.tasks[0].lastStatus' <<<"$result")" = STOPPED ]; then
    stopped=true
    if jq -e '(.tasks[0].containers|length)>0 and all(.tasks[0].containers[]; .exitCode==0)' <<<"$result" >/dev/null; then
      echo 'Marketplace task completed successfully'
      exit 0
    fi
    jq -r '.tasks[0].stoppedReason // "Marketplace task failed"' <<<"$result" >&2
    exit 1
  fi
  sleep 6
done
echo 'Marketplace task timed out' >&2
exit 1
