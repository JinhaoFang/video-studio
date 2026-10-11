/**
 * Configure the CLI entry point and bundler for this studio.
 * Node API callers must pass their own options instead of relying on this file.
 */

import { Config } from "@remotion/cli/config";

Config.setEntryPoint("./episodes/index.ts");
Config.setRspack(true);
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
