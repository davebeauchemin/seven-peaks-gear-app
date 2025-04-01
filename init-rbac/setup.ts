import { spawn } from "child_process";
import * as readline from "readline";

const args = process.argv.slice(2); // Get command-line arguments

function runCommand(command: string, args: string[]) {
  console.log(`Running ${command} ${args.join(" ")}...`);

  // Using spawn instead of exec to maintain the interactive terminal
  const child = spawn(command, args, {
    stdio: "inherit", // This is crucial for interactive commands
    shell: true,
    detached: false,
  });

  child.on("close", (code) => {
    console.log(`Process completed with code ${code}`);
    // Force exit the Node.js process
    process.exit(0);
  });

  child.on("error", (err) => {
    console.error(`An error occurred: ${err.message}`);
    process.exit(1);
  });
}

// Function to confirm with the user
function confirmAction(
  rl: readline.Interface,
  callback: (confirmed: boolean) => void
) {
  rl.question(
    "WARNING: This will reset the database, schema, and delete all data. Are you sure? (yes/no): ",
    (confirmation: string) => {
      const confirmed = confirmation.toLowerCase() === "yes";
      if (!confirmed) {
        console.log("Operation cancelled.");
      }
      callback(confirmed);
    }
  );
}

// Check if level argument is provided
if (args.length > 0) {
  let command: string = "npm";
  let npmArgs: string[];
  let level: string = "";

  if (args[0] === "level-1") {
    level = "1";
    npmArgs = ["run", "init-level-one"];
  } else if (args[0] === "level-2") {
    level = "2";
    npmArgs = ["run", "init-level-two"];
  } else {
    console.log("Invalid argument. Please use level-1 or level-2.");
    process.exit(1);
  }

  // Create readline interface for confirmation
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  confirmAction(rl, (confirmed) => {
    rl.close();
    if (confirmed) {
      runCommand(command, npmArgs);
    } else {
      process.exit(0);
    }
  });
} else {
  // If no arguments provided, prompt the user
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question(
    "Do you want to setup level-1 or level-2? (1/2): ",
    (answer: string) => {
      let command: string = "npm";
      let npmArgs: string[];

      if (answer === "1") {
        npmArgs = ["run", "init-level-one"];
      } else if (answer === "2") {
        npmArgs = ["run", "init-level-two"];
      } else {
        console.log("Invalid choice. Please enter 1 or 2.");
        rl.close();
        return; // Exit early if the input is invalid
      }

      confirmAction(rl, (confirmed) => {
        rl.close();
        if (confirmed) {
          runCommand(command, npmArgs);
        } else {
          process.exit(0);
        }
      });
    }
  );
}
