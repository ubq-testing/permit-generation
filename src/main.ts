import * as core from "@actions/core";
import * as github from "@actions/github";
import { Octokit } from "@octokit/rest";
import { Value } from "@sinclair/typebox/value";
import { envSchema, permitGenerationSettingsSchema, PluginInputs, permitGenerationSettingsValidator } from "./types";
import { plugin } from "./plugin";

export async function run() {
  const payload = github.context.payload.inputs;

  const env = Value.Decode(envSchema, payload.env);
  const settings = Value.Decode(permitGenerationSettingsSchema, Value.Default(permitGenerationSettingsSchema, JSON.parse(payload.settings)));

  if (!permitGenerationSettingsValidator.test(settings)) {
    throw new Error("Invalid settings provided");
  }

  const inputs: PluginInputs = {
    stateId: payload.stateId,
    eventName: payload.eventName,
    eventPayload: JSON.parse(payload.eventPayload),
    settings,
    authToken: payload.authToken,
    ref: payload.ref,
  };

  await plugin(inputs, env);

  return returnDataToKernel(inputs.authToken, inputs.stateId, {});
}

async function returnDataToKernel(repoToken: string, stateId: string, output: object) {
  const octokit = new Octokit({ auth: repoToken });
  await octokit.repos.createDispatchEvent({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    event_type: "return_data_to_ubiquibot_kernel",
    client_payload: {
      state_id: stateId,
      output: JSON.stringify(output),
    },
  });
}

run()
  .then((result) => {
    core.setOutput("result", result);
  })
  .catch((error) => {
    console.error(error);
    core.setFailed(error);
  });
