const seedLevel = process.argv[2]; // This will be 'level-one' or 'level-two'

// Use seedLevel to determine which data to seed
if (seedLevel === "level-one") {
  // Seed level one data
  require("./seed-level-one");
} else if (seedLevel === "level-two") {
  // Seed level two data
  require("./seed-level-two");
} else {
  console.error("Invalid seed level specified.");
}
