import nextEnvironment from "@next/env";

// Match `next dev` configuration; values already present in the process take precedence.
nextEnvironment.loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
const { getCoachConfiguration, requestCoachResponse } = await import("../src/modules/coach/openai.ts");
const configuration = getCoachConfiguration();
if (!configuration.configured) {
  console.error(`OpenAI is not configured. Set valid values for: ${configuration.invalidVariables.join(", ")}.`);
  process.exitCode = 1;
} else if (!process.argv.includes("--live")) {
  console.log(`Configuration valid: model=${configuration.model}, timeout=${configuration.timeoutMs}ms, output limit=${configuration.maxOutputTokens} tokens.`);
  console.log("No API request sent. Run npm run coach:check:live for one billable synthetic connection test.");
} else {
  const result = await requestCoachResponse({
    instructions: "This is a connection test. Reply only with ATHLETEOS_OK.",
    messages: [{ role: "user", content: "Check the AthleteOS API connection." }],
  });
  if (!result.ok) {
    console.error(`OpenAI connection check failed: ${result.code}.`);
    process.exitCode = 1;
  } else if (result.text.trim() !== "ATHLETEOS_OK") {
    console.error("OpenAI responded, but the connection-test marker was not returned.");
    process.exitCode = 1;
  } else {
    console.log(`OpenAI connection verified: model=${result.model}, input tokens=${result.usage?.inputTokens ?? "unavailable"}, output tokens=${result.usage?.outputTokens ?? "unavailable"}.`);
  }
}
