import figlet from "figlet";
import gradient from "gradient-string";
import ora from "ora";
import boxen from "boxen";
import chalk from "chalk";

// Nice colorful gradient palette
const voltageGradient = gradient([
  { color: "#00FFFF", pos: 0 },
  { color: "#00AAFF", pos: 0.2 },
  { color: "#0066FF", pos: 0.4 },
  { color: "#3300FF", pos: 0.6 },
  { color: "#AA00FF", pos: 0.8 },
  { color: "#FF00FF", pos: 1 },
]);

// Logo animation
export const showLogo = async (): Promise<void> => {
  return new Promise((resolve) => {
    // Create ASCII art logo
    figlet.text(
      "VoltAgent",
      {
        font: "Slant",
        horizontalLayout: "default",
        verticalLayout: "default",
      },
      (err, data) => {
        if (err) {
          resolve();
          return;
        }

        // Apply gradient color and show
        console.log("\n");
        console.log(voltageGradient.multiline(data || "VoltAgent"));
        console.log("\n");

        setTimeout(() => {
          resolve();
        }, 500);
      },
    );
  });
};

// Show welcome message
export const showWelcomeMessage = (): void => {
  const message = boxen(
    `${chalk.bold("Welcome to VoltAgent Generator!")}\n\n` +
      `${chalk.dim("Create powerful AI agents with VoltAgent.")}`,
    {
      padding: 1,
      margin: 1,
      borderStyle: "round",
      borderColor: "cyan",
    },
  );

  console.log(message);
};

// Loading animation
export const createSpinner = (text: string) => {
  return ora({
    text,
    spinner: "dots",
    color: "cyan",
  });
};

// Typewriter effect
export const typewriter = async (text: string, speed = 50): Promise<void> => {
  return new Promise((resolve) => {
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        process.stdout.write(text[i]);
        i++;
      } else {
        clearInterval(timer);
        resolve();
      }
    }, speed);
  });
};

// Colorful typewriter
export const colorTypewriter = async (text: string, speed = 50): Promise<void> => {
  return new Promise((resolve) => {
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        process.stdout.write(voltageGradient(text[i]));
        i++;
      } else {
        clearInterval(timer);
        console.log("\n");
        resolve();
      }
    }, speed);
  });
};

// Sleep function
export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

// Closing message
export const showSuccessMessage = (projectName: string): void => {
  console.log("\n");
  console.log(
    boxen(
      voltageGradient.multiline(figlet.textSync("Success!", { horizontalLayout: "fitted" })) +
        "\n\n" +
        chalk.green(`Your project ${chalk.bold.white(projectName)} has been created!`) +
        "\n\n" +
        chalk.dim("Ready to build the future of AI agents! 🚀"),
      {
        padding: 1,
        margin: 1,
        borderStyle: "double",
        borderColor: "green",
      },
    ),
  );
};
