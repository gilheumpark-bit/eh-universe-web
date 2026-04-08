module.exports = {
  processHFCPTurn: jest.fn().mockReturnValue({
    mode: "normal",
    verdict: "pass",
    score: 1,
    promptModifier: "",
  }),
};
