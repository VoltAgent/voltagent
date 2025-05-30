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
        "Full observability features",
        "1 free seat",
        "10k traces per month",
        "Up to 2 agents",
        "30 days data retention",
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
        "Up to 10 seats included",
        "100k traces per month",
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
        "Self-hosted deployment",
        "Unlimited users & spans",
        "Enterprise only features",
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
          pro: "10 seats",
          enterprise: "Unlimited",
        },
        {
          name: "Data Retention",
          free: "30 days",
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
          free: true,
          pro: true,
          enterprise: true,
        },
        {
          name: "LiteLLM Proxy Integration",
          free: true,
          pro: true,
          enterprise: true,
        },
        {
          name: "Custom API Access",
          free: true,
          pro: true,
          enterprise: true,
        },
      ],
    },
    {
      category: "Advanced Features",
      features: [
        {
          name: "Prompt Management",
          free: true,
          pro: true,
          enterprise: true,
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
        <CheckCircleIcon className="w-5 h-5 text-emerald-400 mx-auto" />
      ) : (
        <XMarkIcon className="w-5 h-5 text-gray-500 mx-auto" />
      );
    }
    return <span className="text-sm text-gray-300">{value}</span>;
  };

  return (
    <section className="relative w-full py-12 sm:py-16 md:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-left mb-12 sm:mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-left mb-12">
              <h2 className="text-xl sm:text-2xl md:text-3xl text-emerald-500 font-bold mb-4">
                Simple, Transparent Pricing
              </h2>
              <p className="text-gray-400 max-w-3xl text-sm sm:text-base md:text-lg">
                Start free, scale as you grow.
              </p>
            </div>
          </motion.div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-16">
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
              <div className="p-6 sm:p-8">
                {/* Plan Name */}
                <div className="text-left mb-6">
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                    {tier.name}
                  </h3>
                  <p className="text-gray-400 text-sm">{tier.description}</p>
                </div>

                {/* CTA Button */}
                <button
                  type="button"
                  className={`w-full inline-flex mb-6 items-center justify-center no-underline border-solid border font-semibold rounded transition-colors cursor-pointer px-4 py-3 ${
                    tier.buttonVariant === "primary"
                      ? "bg-emerald-400 text-gray-900 border-emerald-400 hover:bg-emerald-300"
                      : "bg-emerald-400/10 text-emerald-400 border-emerald-400/20 hover:bg-emerald-400/20"
                  }`}
                >
                  {tier.buttonText}
                </button>

                {/* Price */}
                <div className="text-left mb-8">
                  <div className="flex items-baseline justify-start">
                    <span className="text-3xl sm:text-4xl font-bold text-white">
                      {tier.price}
                    </span>
                    {tier.period && (
                      <span className="text-gray-400 ml-1">{tier.period}</span>
                    )}
                  </div>
                  {tier.name === "Free" && (
                    <p className="text-emerald-400 text-xs mt-1">
                      No credit card required
                    </p>
                  )}
                </div>

                {/* Features */}
                <div className="space-y-4 ">
                  {tier.features.map((feature) => (
                    <div key={`${tier.name}-${feature}`}>
                      <div className="flex items-start">
                        <CheckCircleIcon className="w-5 h-5 text-emerald-400 mr-3  flex-shrink-0" />
                        <span className="text-gray-300 text-sm">{feature}</span>
                      </div>
                      {feature === "Up to 10 seats included" && (
                        <p className="text-emerald-400 text-xs mt-1 ml-8">
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-12 w-full -mx-4 sm:-mx-6"
        >
          <div className="w-full bg-[#191c24] overflow-hidden">
            <div className="overflow-x-auto w-full">
              <table className="w-full table-fixed border-collapse border-spacing-0 min-w-full">
                <thead>
                  <tr className="border-b border-gray-700/50">
                    <th className="text-left py-4 px-4 sm:px-8 text-sm font-semibold text-gray-300 bg-[#191c24] w-1/4">
                      Features
                    </th>
                    <th className="text-center py-4 px-4 sm:px-8 text-sm font-semibold text-gray-300 bg-[#191c24] w-1/4">
                      Free
                    </th>
                    <th className="text-center py-4 px-4 sm:px-8 text-sm font-semibold text-emerald-400 bg-[#191c24] w-1/4">
                      Pro
                    </th>
                    <th className="text-center py-4 px-4 sm:px-8 text-sm font-semibold text-gray-300 bg-[#191c24] w-1/4">
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
                          className="py-4 px-4 sm:px-8 text-sm font-semibold text-emerald-400 bg-gray-800/30"
                        >
                          {category.category}
                        </td>
                      </tr>
                      {category.features.map((feature) => (
                        <tr
                          key={`${category.category}-${feature.name}`}
                          className="border-b border-gray-700 hover:bg-gray-800/20 transition-colors"
                        >
                          <td className="py-4 px-4 sm:px-8 text-sm text-gray-300">
                            {feature.name}
                          </td>
                          <td className="py-4 px-4 sm:px-8 text-center">
                            {renderFeatureValue(feature.free)}
                          </td>
                          <td className="py-4 px-4 sm:px-8 text-center">
                            {renderFeatureValue(feature.pro)}
                          </td>
                          <td className="py-4 px-4 sm:px-8 text-center">
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
        </motion.div>
      </div>

      {/* Additional Info */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center mt-12"
        >
          <p className="text-gray-400 text-sm">
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
