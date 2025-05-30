import React from "react";
import { motion } from "framer-motion";
import { CheckIcon } from "@heroicons/react/24/outline";
import { BoltIcon } from "@heroicons/react/24/solid";

const PricingSection = () => {
  const pricingTiers = [
    {
      name: "Free",
      price: "$0",
      period: "/month",
      description: "Perfect for getting started with AI agent monitoring",
      features: [
        "1 free seat",
        "10,000 traces per month",
        "Maximum 2 agents",
        "Basic monitoring dashboard",
        "Community support",
      ],
      buttonText: "Get Started",
      buttonVariant: "outline",
      popular: false,
    },
    {
      name: "Pro",
      price: "$49",
      period: "/month",
      description: "Ideal for growing teams and production environments",
      features: [
        "Up to 10 seats included",
        "100,000 traces per month",
        "Unlimited agents",
        "Advanced analytics",
        "Priority support",
        "$49 per additional seat",
      ],
      buttonText: "Start Pro Trial",
      buttonVariant: "primary",
      popular: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      description: "For large organizations with specific requirements",
      features: [
        "Self-hosted deployment",
        "Unlimited users",
        "Unlimited spans",
        "Custom SSO integration",
        "SOC 2 compliance",
        "Dedicated support",
        "Advanced security features",
      ],
      buttonText: "Contact Sales",
      buttonVariant: "outline",
      popular: false,
    },
  ];

  return (
    <section className="relative w-full py-12 sm:py-16 md:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center justify-center mb-4">
              <BoltIcon className="w-6 h-6 text-[#00d992] mr-2" />
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
                Simple, Transparent Pricing
              </h2>
            </div>
            <p className="text-gray-400 text-lg max-w-3xl mx-auto">
              Choose the plan that fits your team's needs. Start free and scale
              as you grow.
            </p>
          </motion.div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {pricingTiers.map((tier, index) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative rounded-lg border-2 bg-gray-900/50 backdrop-blur-sm transition-all duration-300 hover:border-emerald-400/50 ${
                tier.popular
                  ? "border-emerald-400 shadow-lg shadow-emerald-400/20"
                  : "border-gray-700/50"
              }`}
            >
              {/* Popular Badge */}
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <div className="bg-emerald-400 text-gray-900 px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </div>
                </div>
              )}

              <div className="p-6 sm:p-8">
                {/* Plan Name */}
                <div className="text-center mb-6">
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                    {tier.name}
                  </h3>
                  <p className="text-gray-400 text-sm">{tier.description}</p>
                </div>

                {/* Price */}
                <div className="text-center mb-8">
                  <div className="flex items-baseline justify-center">
                    <span className="text-3xl sm:text-4xl font-bold text-white">
                      {tier.price}
                    </span>
                    {tier.period && (
                      <span className="text-gray-400 ml-1">{tier.period}</span>
                    )}
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-4 mb-8">
                  {tier.features.map((feature) => (
                    <div
                      key={`${tier.name}-${feature}`}
                      className="flex items-start"
                    >
                      <CheckIcon className="w-5 h-5 text-emerald-400 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300 text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <button
                  type="button"
                  className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 ${
                    tier.buttonVariant === "primary"
                      ? "bg-emerald-400 text-gray-900 hover:bg-emerald-300"
                      : "border-2 border-emerald-400 text-emerald-400 hover:bg-emerald-400 hover:text-gray-900"
                  }`}
                >
                  {tier.buttonText}
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Additional Info */}
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
