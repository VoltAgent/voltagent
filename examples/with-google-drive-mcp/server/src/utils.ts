export const generateFunnyVoltAgentId = (): string => {
  const funnyNames = [
    "VoltAgent-Whisperer",
    "Code-Conjurer-Volt",
    "Bug-Blaster-Agent",
    "Volt-Powered-Humor",
    "Agent-Of-Laughs",
    "Syntax-Sorcerer-Volt",
    "Voltagent-Jester",
    "Captain-Code-Volt",
    "The-Volt-Tickler",
    "Giggle-Generator-Volt",
    "Agent-Chuckles",
    "Sir-Volts-A-Lot",
  ];
  const randomIndex = Math.floor(Math.random() * funnyNames.length);
  // Append a small random number for a bit more uniqueness, just in case
  const randomNumber = Math.floor(Math.random() * 1000);
  return `${funnyNames[randomIndex]}-${randomNumber}`;
};
