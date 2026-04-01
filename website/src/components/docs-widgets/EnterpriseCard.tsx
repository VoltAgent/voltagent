import { BuildingOffice2Icon, ChatBubbleLeftRightIcon } from "@heroicons/react/24/solid";

export default function EnterpriseCard() {
  return (
    <div className="my-6 relative">
      <div className="rounded-lg overflow-hidden border border-solid border-zinc-700/50">
        {/* Header with yellow background */}
        <div className="flex items-center gap-2 px-4 py-2.5" style={{ backgroundColor: "#facc15" }}>
          <BuildingOffice2Icon className="w-5 h-5 text-black" />
          <span className="text-[15px] font-semibold text-black">
            Enterprise Support + Self-hosted
          </span>
        </div>

        {/* Content */}
        <div className="p-6" style={{ backgroundColor: "#9ca3af0d" }}>
          <p
            className="mb-3"
            style={{ color: "#B2B2B2", fontSize: "16px", fontFamily: "Inter, sans-serif" }}
          >
            For teams that need to self-host VoltAgent Console. We also offer enterprise support:
          </p>
          <div
            className="space-y-1.5"
            style={{ color: "#B2B2B2", fontSize: "16px", fontFamily: "Inter, sans-serif" }}
          >
            <div>• Deploy with Docker or Kubernetes on any cloud provider</div>
            <div>• Slack Priority Support</div>
            <div>• Unlimited tracing & role-based access control</div>
            <div>• Works with AWS, GCP, Azure, or on-premise environments</div>
            <div>• Connect to your existing auth and security infrastructure</div>
            <div>• Custom MSA</div>
          </div>
          <div className="flex justify-center items-center mt-4">
            <a
              href="https://forms.gle/nmXKC7RbYhouBs2A6"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 unstyled-anchor rounded-md font-medium transition-opacity hover:opacity-80 no-underline border border-solid flex items-center gap-2"
              style={{
                backgroundColor: "transparent",
                borderColor: "#9ca3af33",
                fontFamily: "Inter, sans-serif",
              }}
            >
              <ChatBubbleLeftRightIcon className="w-4 h-4" />
              Contact us for enterprise
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
