export const AWARD_STANDINGS = [
  {
    label: "🥇 1st Place (Winner)",
    value: "1st Place",
    certText: "First Place",
    suggestedTitle: "Winner Certificate",
  },
  {
    label: "🥈 2nd Place (Runner-up)",
    value: "2nd Place",
    certText: "Second Place",
    suggestedTitle: "Runner-up Certificate",
  },
  {
    label: "🥉 3rd Place (Second Runner-up)",
    value: "3rd Place",
    certText: "Third Place",
    suggestedTitle: "Second Runner-up Certificate",
  },
  {
    label: "⭐ Special Mention",
    value: "Special Mention",
    certText: "Special Mention",
    suggestedTitle: "Special Mention Certificate",
  },
  {
    label: "💡 Best Innovation",
    value: "Best Innovation",
    certText: "Best Innovation",
    suggestedTitle: "Best Innovation Certificate",
  },
  {
    label: "🎯 Best Presentation",
    value: "Best Presentation",
    certText: "Best Presentation",
    suggestedTitle: "Best Presentation Certificate",
  },
  {
    label: "🏅 Certificate of Merit",
    value: "Certificate of Merit",
    certText: "Merit & Achievement",
    suggestedTitle: "Certificate of Merit",
  },
];

export const getSuggestedCertificateTitle = (standingValue) => {
  const match = AWARD_STANDINGS.find(
    (s) => s.value.toLowerCase() === (standingValue || "").toLowerCase()
  );
  return match ? match.suggestedTitle : (standingValue ? `${standingValue} Certificate` : "Certificate of Achievement");
};

export const getSuggestedAchievementText = (standingValue) => {
  const match = AWARD_STANDINGS.find(
    (s) => s.value.toLowerCase() === (standingValue || "").toLowerCase()
  );
  return match ? match.certText : (standingValue || "Merit & Achievement");
};
