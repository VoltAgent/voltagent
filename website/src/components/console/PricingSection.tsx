import React from "react";
import { motion } from "framer-motion";
import { CheckCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";

const PricingSection = () => {
  const pricingTiers = [
    {
      name: "Free",
      price: "$0",
      period: "/month",
      description: "Perfect for getting started with AI agent monitoring",
      features: [
        "1 seat, 1 organization, 1 project",
        "10.000 events per month",
        "1000 requests/min",
        "Up to 5 agents",
        "7-day data retention",
      ],
      buttonText: "Get Started",
      buttonVariant: "outline",
      popular: false,
    },
    {
      name: "Pro",
      price: "$50",
      period: "/month",
      description: "Ideal for growing teams and production environments",
      features: [
        "Up to 5 seats included",
        "100.000 events per month",
        "4000 requests/min",
        "Unlimited agents",
        "90 days data retention",
        "Priority support",
      ],
      buttonText: "Get Started",
      buttonVariant: "primary",
      popular: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      description: "For large organizations with specific requirements",
      features: [
        "Everything in Pro",
        "Enterprise only features",
        "Self-hosted deployment",
        "Unlimited users & events",
        "Dedicated support",
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
          pro: true,
          enterprise: true,
        },
        {
          name: "Session & User Tracking",
          free: true,
          pro: true,
          enterprise: true,
        },
        {
          name: "Token & Cost Analysis",
          free: true,
          pro: true,
          enterprise: true,
        },
        {
          name: "Multi-modal Support",
          free: true,
          pro: true,
          enterprise: true,
        },
      ],
    },
    {
      category: "Usage & Limits",
      features: [
        {
          name: "Monthly Events",
          free: "10k events",
          pro: "100k events",
          enterprise: "Unlimited",
        },
        {
          name: "Team Members",
          free: "1 seat",
          pro: "5 seats",
          enterprise: "Unlimited",
        },
        {
          name: "Data Retention",
          free: "7 days",
          pro: "90 days",
          enterprise: "Unlimited",
        },
        {
          name: "API Rate Limit",
          free: "1k req/min",
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
          pro: true,
          enterprise: true,
        },
        {
          name: "OpenTelemetry Support",
          free: "soon",
          pro: "soon",
          enterprise: "soon",
        },
        {
          name: "LiteLLM Proxy Integration",
          free: "soon",
          pro: "soon",
          enterprise: "soon",
        },
        {
          name: "Custom API Access",
          free: "soon",
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
          free: "soon",
          pro: "soon",
          enterprise: "soon",
        },
        {
          name: "Priority Support",
          free: false,
          pro: true,
          enterprise: true,
        },
        {
          name: "Self-hosted Deployment",
          free: false,
          pro: false,
          enterprise: true,
        },
        {
          name: "Enterprise SSO",
          free: false,
          pro: false,
          enterprise: true,
        },
      ],
    },
    {
      category: "Enterprise Features",
      features: [
        {
          name: "SSO & SAML Integration",
          free: false,
          pro: false,
          enterprise: true,
        },
        {
          name: "LDAP & RBAC",
          free: false,
          pro: false,
          enterprise: true,
        },
        {
          name: "Versioning & Audit Logs",
          free: false,
          pro: false,
          enterprise: true,
        },
        {
          name: "Custom SLA",
          free: false,
          pro: false,
          enterprise: true,
        },
        {
          name: "Dedicated Support Team",
          free: false,
          pro: false,
          enterprise: true,
        },
      ],
    },
  ];

  const renderFeatureValue = (value: boolean | string) => {
    if (typeof value === "boolean") {
      return value ? (
        <CheckCircleIcon className="w-4 h-4 landing-xs:w-3 landing-xs:h-3 landing-sm:w-5 landing-sm:h-5 text-emerald-400 mx-auto" />
      ) : (
        <XMarkIcon className="w-4 h-4 landing-xs:w-3 landing-xs:h-3 landing-sm:w-5 landing-sm:h-5 text-gray-500 mx-auto" />
      );
    }

    if (value === "soon") {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
          Soon
        </span>
      );
    }

    return (
      <span className="text-xs landing-xs:text-xs landing-sm:text-sm text-gray-300">
        {value}
      </span>
    );
  };

  return (
    <section className="relative w-full py-8 landing-xs:py-6 landing-sm:py-12 landing-md:py-16 landing-lg:py-20">
      <div className="max-w-7xl mx-auto px-4 landing-xs:px-3 landing-sm:px-6">
        {/* Header */}
        <div className="text-left mb-8 landing-xs:mb-6 landing-sm:mb-12 landing-md:mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-left mb-8 landing-xs:mb-6 landing-sm:mb-12">
              <h2 className="text-lg landing-xs:text-base landing-sm:text-xl landing-md:text-2xl landing-lg:text-3xl text-emerald-500 font-bold mb-3 landing-xs:mb-2 landing-sm:mb-4">
                Simple, Transparent Pricing
              </h2>
              <p className="text-gray-400 max-w-3xl text-sm landing-xs:text-xs landing-sm:text-base landing-md:text-lg">
                Start free, scale as you grow.
              </p>
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 landing-md:grid-cols-3 gap-4 landing-xs:gap-3 landing-sm:gap-6 landing-md:gap-8 mb-10 landing-xs:mb-8 landing-sm:mb-12 landing-md:mb-16">
          {pricingTiers.map((tier, index) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative rounded-lg border-solid border-2 bg-[#191c24] backdrop-blur-sm transition-all duration-300 hover:border-emerald-400/50 ${
                tier.popular
                  ? "border-emerald-400 shadow-lg shadow-emerald-400/20"
                  : "border-gray-700/50"
              }`}
            >
              <div className="p-4 landing-xs:p-3 landing-sm:p-6 landing-md:p-8">
                <div className="text-left mb-4 landing-xs:mb-3 landing-sm:mb-6">
                  <h3 className="text-lg landing-xs:text-base landing-sm:text-xl landing-md:text-2xl font-bold text-white mb-2 landing-xs:mb-1">
                    {tier.name}
                  </h3>
                  <p className="text-gray-400 text-xs landing-xs:text-xs landing-sm:text-sm">
                    {tier.description}
                  </p>
                </div>

                <button
                  type="button"
                  className={`w-full inline-flex mb-4 landing-xs:mb-3 landing-sm:mb-6 items-center justify-center no-underline border-solid border font-semibold rounded transition-colors cursor-pointer px-3 landing-xs:px-2 landing-sm:px-4 py-2 landing-xs:py-1.5 landing-sm:py-3 text-sm landing-xs:text-xs landing-sm:text-base ${
                    tier.buttonVariant === "primary"
                      ? "bg-emerald-400 text-gray-900 border-emerald-400 hover:bg-emerald-300"
                      : "bg-emerald-400/10 text-emerald-400 border-emerald-400/20 hover:bg-emerald-400/20"
                  }`}
                >
                  {tier.buttonText}
                </button>

                <div className="text-left mb-6 landing-xs:mb-4 landing-sm:mb-8">
                  <div className="flex items-baseline justify-start">
                    <span className="text-2xl landing-xs:text-xl landing-sm:text-3xl landing-md:text-4xl font-bold text-white">
                      {tier.price}
                    </span>
                    {tier.period && (
                      <span className="text-gray-400 ml-1 text-sm landing-xs:text-xs">
                        {tier.period}
                      </span>
                    )}
                  </div>
                  {tier.name === "Free" && (
                    <p className="text-emerald-400 text-xs landing-xs:text-xs mt-1">
                      No credit card required
                    </p>
                  )}
                </div>

                <div className="space-y-3 landing-xs:space-y-2 landing-sm:space-y-4">
                  {tier.features.map((feature) => (
                    <div key={`${tier.name}-${feature}`}>
                      <div className="flex items-start">
                        <CheckCircleIcon className="w-4 h-4 landing-xs:w-3 landing-xs:h-3 landing-sm:w-5 landing-sm:h-5 text-emerald-400 mr-2 landing-xs:mr-1.5 landing-sm:mr-3 flex-shrink-0" />
                        <span
                          className={`text-xs landing-xs:text-xs landing-sm:text-sm ${
                            feature === "Enterprise only features"
                              ? "text-emerald-500 font-medium"
                              : "text-gray-300"
                          }`}
                        >
                          {feature}
                        </span>
                      </div>
                      {feature === "Up to 10 seats included" && (
                        <p className="text-emerald-400 text-xs landing-xs:text-xs mt-1 ml-6 landing-xs:ml-4 landing-sm:ml-8">
                          $50 per additional seat
                        </p>
                      )}
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
                  <th className="text-center py-3 landing-xs:py-2 landing-sm:py-4 px-3 landing-xs:px-2 landing-sm:px-4 landing-md:px-8 text-xs landing-xs:text-xs landing-sm:text-sm font-semibold text-gray-300 bg-[#191c24] w-[26.67%]">
                    Free
                  </th>
                  <th className="text-center py-3 landing-xs:py-2 landing-sm:py-4 px-3 landing-xs:px-2 landing-sm:px-4 landing-md:px-8 text-xs landing-xs:text-xs landing-sm:text-sm font-semibold text-emerald-400 bg-[#191c24] w-[26.67%]">
                    Pro
                  </th>
                  <th className="text-center py-3 landing-xs:py-2 landing-sm:py-4 px-3 landing-xs:px-2 landing-sm:px-4 landing-md:px-8 text-xs landing-xs:text-xs landing-sm:text-sm font-semibold text-gray-300 bg-[#191c24] w-[26.67%]">
                    Enterprise
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((category) => (
                  <React.Fragment key={category.category}>
                    <tr className="border-b border-gray-700/30">
                      <td
                        colSpan={4}
                        className="py-3 landing-xs:py-2 landing-sm:py-4 px-3 landing-xs:px-2 landing-sm:px-4 landing-md:px-8 text-xs landing-xs:text-xs landing-sm:text-sm font-semibold text-emerald-400 bg-gray-800/30"
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
            All plans include our core monitoring features. Need something
            custom?{" "}
            <span className="text-emerald-400 cursor-pointer hover:underline">
              Contact us
            </span>{" "}
            for a tailored solution.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingSection;
