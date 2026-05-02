const brandFirst = "Abdullah";
const brandSecond = "Yosry";

export const siteConfig = {
  name: `${brandFirst} ${brandSecond}`,
  brandFirst,
  brandSecond,
  title: "Abdullah Yosry — Portfolio",
  description: "Portfolio and selected work.",
  nav: [] as const,
  links: {
    github: "",
    linkedin: "",
    email: "",
  },
} as const;
