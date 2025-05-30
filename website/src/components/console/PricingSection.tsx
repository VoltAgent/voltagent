import React from "react";
import { motion } from "framer-motion";
import { CheckCircleIcon } from "@heroicons/react/24/outline";

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
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
