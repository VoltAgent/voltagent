import { CalculatorIcon, CheckCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import React, { useState } from "react";
import PricingCalculatorModal from "./PricingCalculatorModal";

interface PricingSectionProps {
  primaryColor?: string;
  primaryColorHover?: string;
  primaryColorBorder?: string;
  primaryColorShadow?: string;
  primaryColorText?: string;
}

const PricingSection = ({
  primaryColor = "emerald-400",
  primaryColorHover = "emerald-300",
  primaryColorBorder = "emerald-500/30",
  primaryColorShadow = "emerald-400/20",
  primaryColorText = "emerald-500",
}: PricingSectionProps) => {
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const pricingTiers = [
    {
      name: "Free",
      price: "$0",
      period: "/month",
      description: "Perfect for getting started with AI agent monitoring",
      features: [
        "1 seat, 1 project",
        "250 traces/month",
        "3 prompts",
        "3 agents",
        "7-day retention",
      ],
      buttonText: "Get Started",
      buttonVariant: "outline",
      popular: false,
    },
    {
      name: "Core",
      price: "$50",
      period: "/month",
      description: "Perfect for small teams and production environments",
      features: [
        "5 seats included",
        "5,000 traces/month",
        "Pay-as-you-scale pricing",
        "Unlimited agents & prompts",
        "90 days retention",
        "Priority support",
      ],
      buttonText: "Get Started",
      buttonVariant: "primary",
      popular: true,
    },
    {
      name: "Pro",
      price: "$250",
      period: "/month",
      description: "Ideal for larger teams with advanced needs",
      features: [
        "20 seats included",
        "20,000 traces/month",
        "Pay-as-you-scale pricing",
        "Unlimited agents & prompts",
        "SSO Integration",
        "Slack support",
        "Advanced analytics",
      ],
      buttonText: "Get Started",
      buttonVariant: "outline",
      popular: false,
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      description: "For large organizations with specific requirements",
      features: [
        "Everything in Pro",
        "Unlimited users & events",
        "Self-hosted deployment",
        "Dedicated support",
        "Custom integrations",
      ],
      buttonText: "Contact Sales",
      buttonVariant: "outline",
      popular: false,
    },
  ];

  const comparisonFeatures = [
    {
      category: "Core Features",
      features: [
        {
          name: "LLM Traces & Agent Monitoring",
          free: true,
          core: true,
          pro: true,
          enterprise: true,
        },
        {
          name: "Session & User Tracking",
          free: true,
          core: true,
          pro: true,
          enterprise: true,
        },
        {
          name: "Token & Cost Analysis",
          free: true,
          core: true,
          pro: true,
          enterprise: true,
        },
        {
          name: "Multi-modal Support",
          free: true,
          core: true,
          pro: true,
          enterprise: true,
        },
      ],
    },
    {
      category: "Usage & Limits",
      features: [
        {
          name: "Monthly Traces",
          free: "250 traces",
          core: "5,000 traces",
          pro: "20,000 traces",
          enterprise: "Unlimited",
        },
        {
          name: "Team Members",
          free: "1 seat",
          core: "5 seats",
          pro: "20 seats",
          enterprise: "Unlimited",
        },
        {
          name: "Data Retention",
          free: "7 days",
          core: "90 days",
          pro: "90 days",
          enterprise: "Unlimited",
        },
        {
          name: "API Rate Limit",
          free: "1k req/min",
          core: "4k req/min",
          pro: "4k req/min",
          enterprise: "Custom",
        },
      ],
    },
    {
      category: "Integrations",
      features: [
        {
          name: "Python & JavaScript SDKs",
          free: true,
          core: true,
          pro: true,
          enterprise: true,
        },
        {
          name: "OpenTelemetry Support",
          free: "soon",
          core: "soon",
          pro: "soon",
          enterprise: "soon",
        },
        {
          name: "LiteLLM Proxy Integration",
          free: "soon",
          core: "soon",
          pro: "soon",
          enterprise: "soon",
        },
        {
          name: "Custom API Access",
          free: "soon",
          core: "soon",
          pro: "soon",
          enterprise: "soon",
        },
      ],
    },
    {
      category: "Advanced Features",
      features: [
        {
          name: "Prompt Management",
          free: "3 prompts",
          core: "Unlimited",
          pro: "Unlimited",
          enterprise: "Unlimited",
        },
        {
          name: "Priority Support",
          free: false,
          core: true,
          pro: true,
          enterprise: true,
        },
        {
          name: "SSO Integration",
          free: false,
          core: false,
          pro: true,
          enterprise: true,
        },
        {
          name: "Self-hosted Deployment",
          free: false,
          core: false,
          pro: false,
          enterprise: true,
        },
      ],
    },
    {
      category: "Enterprise Features",
      features: [
        {
          name: "SAML Integration",
          free: false,
          core: false,
          pro: false,
          enterprise: true,
        },
        {
          name: "LDAP & RBAC",
          free: false,
          core: false,
          pro: false,
          enterprise: true,
        },
        {
          name: "Versioning & Audit Logs",
          free: false,
          core: false,
          pro: false,
          enterprise: true,
        },
        {
          name: "Custom SLA",
          free: false,
          core: false,
          pro: false,
          enterprise: true,
        },
        {
          name: "Dedicated Support Team",
          free: false,
          core: false,
          pro: false,
          enterprise: true,
        },
      ],
    },
  ];

  // Create color mappings for dynamic classes
  const getColorClasses = (colorProp: string) => {
    const colorMap: Record<string, Record<string, string>> = {
      "orange-400": {
        text: "text-orange-400",
        bg: "bg-orange-400",
        border: "border-orange-400",
        hover: "hover:bg-orange-300",
        shadow: "shadow-orange-400/20",
      },
      "orange-300": {
        text: "text-orange-300",
        bg: "bg-orange-300",
        border: "border-orange-300",
        hover: "hover:bg-orange-300",
        shadow: "shadow-orange-300/20",
      },
      "orange-500": {
        text: "text-orange-500",
        bg: "bg-orange-500",
        border: "border-orange-500",
        hover: "hover:bg-orange-400",
        shadow: "shadow-orange-500/20",
      },
      "orange-500/30": {
        text: "text-orange-500",
        bg: "bg-orange-500/30",
        border: "border-orange-500/30",
        hover: "hover:bg-orange-500/40",
        shadow: "shadow-orange-500/30",
      },
      "orange-400/20": {
        text: "text-orange-400",
        bg: "bg-orange-400/20",
        border: "border-orange-400/20",
        hover: "hover:bg-orange-400/30",
        shadow: "shadow-orange-400/20",
      },
      "emerald-400": {
        text: "text-emerald-400",
        bg: "bg-emerald-400",
        border: "border-emerald-400",
        hover: "hover:bg-emerald-300",
        shadow: "shadow-emerald-400/20",
      },
      "emerald-300": {
        text: "text-emerald-300",
        bg: "bg-emerald-300",
        border: "border-emerald-300",
        hover: "hover:bg-emerald-300",
        shadow: "shadow-emerald-300/20",
      },
      "emerald-500": {
        text: "text-emerald-500",
        bg: "bg-emerald-500",
        border: "border-emerald-500",
        hover: "hover:bg-emerald-400",
        shadow: "shadow-emerald-500/20",
      },
    };

    return colorMap[colorProp] || colorMap["emerald-400"];
  };

  const primaryColorClasses = getColorClasses(primaryColor);
  const primaryColorHoverClasses = getColorClasses(primaryColorHover);
  const primaryColorTextClasses = getColorClasses(primaryColorText);
  const primaryColorBorderClasses = getColorClasses(primaryColorBorder);
  const primaryColorShadowClasses = getColorClasses(primaryColorShadow);

  const renderFeatureValue = (value: boolean | string) => {
    if (typeof value === "boolean") {
      return value ? (
        <CheckCircleIcon
          className={`w-4 h-4 landing-xs:w-3 landing-xs:h-3 landing-sm:w-5 landing-sm:h-5 ${primaryColorClasses.text} mx-auto`}
        />
      ) : (
        <XMarkIcon className="w-4 h-4 landing-xs:w-3 landing-xs:h-3 landing-sm:w-5 landing-sm:h-5 text-gray-500 mx-auto" />
      );
    }

    if (value === "soon") {
      return (
        <span
          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${primaryColorTextClasses.bg}/20 ${primaryColorTextClasses.text} border ${primaryColorBorderClasses.border}`}
        >
          Soon
        </span>
      );
    }

    return (
      <span className="text-xs landing-xs:text-xs landing-sm:text-sm text-gray-300">{value}</span>
    );
  };

  return (
    <section className="relative w-full py-8 landing-xs:py-6 landing-sm:py-12 landing-md:py-16 ">
      <div className="max-w-7xl mx-auto px-4 landing-xs:px-3 landing-sm:px-6 landing-md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          data-section="voltops-pricing"
        >
          <div className="text-left mb-8 landing-xs:mb-6 landing-sm:mb-12">
            <h2
              className={`text-lg landing-xs:text-base landing-sm:text-xl landing-md:text-2xl landing-lg:text-3xl ${primaryColorTextClasses.text} font-bold mb-3 landing-xs:mb-2 landing-sm:mb-4`}
            >
              <span className="text-[#DCDCDC]">Simple, Transparent</span> VoltOps{" "}
              <span className="text-[#DCDCDC]">Pricing</span>
            </h2>
            <p className="text-gray-400 max-w-3xl text-sm landing-xs:text-xs landing-sm:text-base landing-md:text-lg">
              Start free, scale as you grow.
            </p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 landing-sm:grid-cols-2 landing-md:grid-cols-4 gap-3 landing-xs:gap-2 landing-sm:gap-4 landing-md:gap-4 mb-10 landing-xs:mb-8 landing-sm:mb-12 landing-md:mb-16">
          {pricingTiers.map((tier, index) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative rounded-lg border-solid border-2 bg-[#191c24] backdrop-blur-sm transition-all duration-300 hover:${
                primaryColorClasses.border
              }/50 ${
                tier.popular
                  ? `${primaryColorClasses.border} shadow-lg ${primaryColorShadowClasses.shadow}`
                  : "border-gray-700/50"
              }`}
            >
              <div className="p-3 landing-xs:p-2 landing-sm:p-4 landing-md:p-4">
                <div className="text-left mb-3 landing-xs:mb-2 landing-sm:mb-4">
                  <h3 className="text-base landing-xs:text-sm landing-sm:text-lg landing-md:text-xl font-bold text-white mb-1">
                    {tier.name}
                  </h3>
                  <p className="text-gray-400 text-xs landing-xs:text-xs landing-sm:text-xs">
                    {tier.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (tier.name === "Enterprise") {
                      window.open("https://forms.gle/BrnyFF4unP9pZxAh7", "_blank");
                    } else if (
                      tier.name === "Free" ||
                      tier.name === "Core" ||
                      tier.name === "Pro"
                    ) {
                      window.open("https://console.voltagent.dev", "_blank");
                    }
                  }}
                  className={`w-full inline-flex mb-3 landing-xs:mb-2 landing-sm:mb-4 items-center justify-center no-underline border-solid border font-semibold rounded transition-colors cursor-pointer px-2 landing-xs:px-1.5 landing-sm:px-3 py-1.5 landing-xs:py-1 landing-sm:py-2 text-xs landing-xs:text-xs landing-sm:text-sm ${
                    tier.buttonVariant === "primary"
                      ? `${primaryColorClasses.bg} text-gray-900 ${primaryColorClasses.border} ${primaryColorHoverClasses.hover}`
                      : `${primaryColorClasses.bg}/10 ${primaryColorClasses.text} ${primaryColorBorderClasses.border} hover:${primaryColorClasses.bg}/20`
                  }`}
                >
                  {tier.buttonText}
                </button>

                <div className="text-left mb-4 landing-xs:mb-3 landing-sm:mb-5">
                  <div className="flex items-baseline justify-start">
                    <span className="text-xl landing-xs:text-lg landing-sm:text-2xl landing-md:text-3xl font-bold text-white">
                      {tier.price}
                    </span>
                    {tier.period && (
                      <span className="text-gray-400 ml-1 text-xs landing-xs:text-xs">
                        {tier.period}
                      </span>
                    )}
                  </div>
                  {tier.name === "Free" && (
                    <p className={`${primaryColorClasses.text} text-xs landing-xs:text-xs mt-1`}>
                      No credit card required
                    </p>
                  )}
                </div>

                <div className="space-y-2 landing-xs:space-y-1.5 landing-sm:space-y-2.5">
                  {tier.features.map((feature) => (
                    <div key={`${tier.name}-${feature}`}>
                      <div className="flex items-start">
                        <CheckCircleIcon
                          className={`w-3 h-3 landing-xs:w-2.5 landing-xs:h-2.5 landing-sm:w-4 landing-sm:h-4 ${primaryColorClasses.text} mr-1.5 landing-xs:mr-1 landing-sm:mr-2 flex-shrink-0`}
                        />
                        <div className="flex-1 flex items-center justify-between">
                          <span
                            className={`text-xs landing-xs:text-xs landing-sm:text-xs ${
                              feature === "Enterprise only features"
                                ? `${primaryColorTextClasses.text} font-medium`
                                : "text-gray-300"
                            }`}
                          >
                            {feature}
                          </span>
                          {feature === "Pay-as-you-scale pricing" && (
                            <span
                              onClick={() => setCalculatorOpen(true)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  setCalculatorOpen(true);
                                }
                              }}
                              role="button"
                              tabIndex={0}
                              className={`${primaryColorClasses.text} hover:${primaryColorHoverClasses.text} text-xs cursor-pointer transition-colors ml-1`}
                            >
                              Calculate
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Comparison Table */}
        <div className="w-full bg-[#191c24] overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full h-full table-fixed border-collapse border-spacing-0 mb-0 min-w-full">
              <thead>
                <tr className="border-b border-gray-700/50">
                  <th className="text-left py-3 landing-xs:py-2 landing-sm:py-4 px-3 landing-xs:px-2 landing-sm:px-4 landing-md:px-8 text-xs landing-xs:text-xs landing-sm:text-sm font-semibold text-gray-300 bg-[#191c24] w-1/5">
                    Features
                  </th>
                  <th className="text-center py-3 landing-xs:py-2 landing-sm:py-4 px-3 landing-xs:px-2 landing-sm:px-4 landing-md:px-8 text-xs landing-xs:text-xs landing-sm:text-sm font-semibold text-gray-300 bg-[#191c24] w-1/5">
                    Free
                  </th>
                  <th
                    className={`text-center py-3 landing-xs:py-2 landing-sm:py-4 px-3 landing-xs:px-2 landing-sm:px-4 landing-md:px-8 text-xs landing-xs:text-xs landing-sm:text-sm font-semibold ${primaryColorClasses.text} bg-[#191c24] w-1/5`}
                  >
                    Core
                  </th>
                  <th className="text-center py-3 landing-xs:py-2 landing-sm:py-4 px-3 landing-xs:px-2 landing-sm:px-4 landing-md:px-8 text-xs landing-xs:text-xs landing-sm:text-sm font-semibold text-gray-300 bg-[#191c24] w-1/5">
                    Pro
                  </th>
                  <th className="text-center py-3 landing-xs:py-2 landing-sm:py-4 px-3 landing-xs:px-2 landing-sm:px-4 landing-md:px-8 text-xs landing-xs:text-xs landing-sm:text-sm font-semibold text-gray-300 bg-[#191c24] w-1/5">
                    Enterprise
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((category) => (
                  <React.Fragment key={category.category}>
                    <tr className="border-b border-gray-700/30">
                      <td
                        colSpan={5}
                        className={`py-3 landing-xs:py-2 landing-sm:py-4 px-3 landing-xs:px-2 landing-sm:px-4 landing-md:px-8 text-xs landing-xs:text-xs landing-sm:text-sm font-semibold ${primaryColorClasses.text} bg-gray-800/30`}
                      >
                        {category.category}
                      </td>
                    </tr>
                    {category.features.map((feature) => (
                      <tr
                        key={`${category.category}-${feature.name}`}
                        className="border-b border-gray-700 hover:bg-gray-800/20 transition-colors"
                      >
                        <td className="py-3 landing-xs:py-2 landing-sm:py-4 px-3 landing-xs:px-2 landing-sm:px-4 landing-md:px-8 text-xs landing-xs:text-xs landing-sm:text-sm text-gray-300">
                          {feature.name}
                        </td>
                        <td className="py-3 landing-xs:py-2 landing-sm:py-4 px-3 landing-xs:px-2 landing-sm:px-4 landing-md:px-8 text-center">
                          {renderFeatureValue(feature.free)}
                        </td>
                        <td className="py-3 landing-xs:py-2 landing-sm:py-4 px-3 landing-xs:px-2 landing-sm:px-4 landing-md:px-8 text-center">
                          {renderFeatureValue(feature.core)}
                        </td>
                        <td className="py-3 landing-xs:py-2 landing-sm:py-4 px-3 landing-xs:px-2 landing-sm:px-4 landing-md:px-8 text-center">
                          {renderFeatureValue(feature.pro)}
                        </td>
                        <td className="py-3 landing-xs:py-2 landing-sm:py-4 px-3 landing-xs:px-2 landing-sm:px-4 landing-md:px-8 text-center">
                          {renderFeatureValue(feature.enterprise)}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="max-w-7xl mx-auto px-4 landing-xs:px-3 landing-sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center mt-8 landing-xs:mt-6 landing-sm:mt-12"
        >
          <p className="text-gray-400 text-xs landing-xs:text-xs landing-sm:text-sm">
            All plans include our core monitoring features. Need something custom?{" "}
            <a
              href="https://forms.gle/BrnyFF4unP9pZxAh7"
              target="_blank"
              rel="noopener noreferrer"
              className={`${primaryColorClasses.text} cursor-pointer hover:underline`}
            >
              Contact us
            </a>{" "}
            for a tailored solution.
          </p>
        </motion.div>
      </div>

      {/* Pricing Calculator Modal */}
      <PricingCalculatorModal isOpen={calculatorOpen} onClose={() => setCalculatorOpen(false)} />
    </section>
  );
};

export default PricingSection;
