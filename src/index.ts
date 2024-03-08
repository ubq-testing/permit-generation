import * as core from "@actions/core";
import * as github from "@actions/github";
import { Octokit } from "@octokit/rest";
import { PluginInputs } from "./types/plugin-input";
import { Context } from "./types/context";
import { generateErc20PermitSignature } from "./handlers/generate-erc20-permit-signature";

async function run() {
  const webhookPayload = github.context.payload.inputs;
  const inputs: PluginInputs = {
    stateId: webhookPayload.stateId,
    eventName: webhookPayload.eventName,
    eventPayload: JSON.parse(webhookPayload.eventPayload),
    settings: JSON.parse(webhookPayload.settings),
    authToken: webhookPayload.authToken,
    ref: webhookPayload.ref,
  };
  const octokit = new Octokit({ auth: inputs.authToken });

  const context: Context = {
    eventName: inputs.eventName,
    payload: inputs.eventPayload,
    config: inputs.settings,
    octokit,
    logger: {
      debug(message: unknown, ...optionalParams: unknown[]) {
        console.debug(message, ...optionalParams);
      },
      info(message: unknown, ...optionalParams: unknown[]) {
        console.log(message, ...optionalParams);
      },
      warn(message: unknown, ...optionalParams: unknown[]) {
        console.warn(message, ...optionalParams);
      },
      error(message: unknown, ...optionalParams: unknown[]) {
        console.error(message, ...optionalParams);
      },
      fatal(message: unknown, ...optionalParams: unknown[]) {
        console.error(message, ...optionalParams);
      },
    },
  };

  // it'll use issue_comment.created for now
  // but will implement on pull_request.closed then filter for as complete/merged
  if (context.eventName === "issue_comment.created") {
    // parse for which permit to generate
    // for now just erc20
    const signature = await generateErc20PermitSignature(context);
    console.log(signature);
    return signature;
  } else {
    throw new Error(`Event ${context.eventName} is not supported`);
  }
}

run()
  .then((result) => core.setOutput("result", result))
  .catch((error) => {
    console.error(error);
    core.setFailed(error);
  });
