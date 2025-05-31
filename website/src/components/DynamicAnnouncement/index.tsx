import React, { useEffect, useState } from "react";

interface AnnouncementContent {
  [key: string]: {
    text: string;
    mobile: string;
    link: string;
    emoji: string;
  };
}

const announcementContent: AnnouncementContent = {
  JP: {
    emoji: "⭐️",
    text: "このプロジェクトへのご支援は私たちに大きな力を与えており、GitHubで星をつけることで、VoltAgentをより多くの人々に届ける手助けができます。",
    mobile: "GitHubで星をつけて、VoltAgentを支援してください。",
    link: "https://github.com/voltagent/voltagent",
  },
  US: {
    emoji: "⭐️",
    text: "You can support VoltAgent by starring us on GitHub and help us reach more developers.",
    mobile: "You can support VoltAgent by starring us on GitHub.",
    link: "https://github.com/voltagent/voltagent",
  },
  IN: {
    emoji: "⭐️",
    text: "आप GitHub पर स्टार देकर VoltAgent का समर्थन कर सकते हैं और अधिक developers तक पहुंचने में हमारी मदद कर सकते हैं।",
    mobile: "आप GitHub पर स्टार देकर VoltAgent का समर्थन कर सकते हैं।",
    link: "https://github.com/voltagent/voltagent",
  },
  TR: {
    emoji: "⭐️",
    text: "GitHub'da yıldız vererek VoltAgent'ı destekleyebilir ve daha fazla geliştiriciye ulaşmamıza yardımcı olabilirsiniz.",
    mobile: "GitHub'da yıldız vererek VoltAgent'ı destekleyebilirsiniz.",
    link: "https://github.com/voltagent/voltagent",
  },
  GB: {
    emoji: "⭐️",
    text: "You can support VoltAgent by starring us on GitHub and help us reach more developers.",
    mobile: "You can support VoltAgent by starring us on GitHub.",
    link: "https://github.com/voltagent/voltagent",
  },
  SG: {
    emoji: "⭐️",
    text: "您可以在GitHub上为VoltAgent点亮星标，帮助我们接触更多的开发者。",
    mobile: "您可以在GitHub上为我们点亮星标来支持VoltAgent。",
    link: "https://github.com/voltagent/voltagent",
  },
  BR: {
    emoji: "⭐️",
    text: "Você pode apoiar o VoltAgent dando uma estrela no GitHub e nos ajudar a alcançar mais desenvolvedores.",
    mobile: "Você pode apoiar o VoltAgent dando uma estrela no GitHub.",
    link: "https://github.com/voltagent/voltagent",
  },
  DE: {
    emoji: "⭐️",
    text: "Sie können VoltAgent unterstützen, indem Sie uns einen Stern auf GitHub geben und uns helfen, mehr Entwickler zu erreichen.",
    mobile: "Sie können VoltAgent mit einem Stern auf GitHub unterstützen.",
    link: "https://github.com/voltagent/voltagent",
  },
  VN: {
    emoji: "⭐️",
    text: "Bạn có thể hỗ trợ VoltAgent bằng cách để lại sao trên GitHub và giúp chúng tôi tiếp cận thêm nhiều developer.",
    mobile: "Bạn có thể hỗ trợ VoltAgent bằng cách để lại sao trên GitHub.",
    link: "https://github.com/voltagent/voltagent",
  },
  ID: {
    emoji: "⭐️",
    text: "Anda dapat mendukung VoltAgent dengan memberi bintang di GitHub dan membantu kami menjangkau lebih banyak developer.",
    mobile: "Anda dapat mendukung VoltAgent dengan memberi bintang di GitHub.",
    link: "https://github.com/voltagent/voltagent",
  },
  MX: {
    emoji: "⭐️",
    text: "Puedes apoyar a VoltAgent dándonos una estrella en GitHub y ayudarnos a llegar a más desarrolladores.",
    mobile: "Puedes apoyar a VoltAgent dándonos una estrella en GitHub.",
    link: "https://github.com/voltagent/voltagent",
  },
  HK: {
    emoji: "⭐️",
    text: "您可以在GitHub上為VoltAgent點亮星標，幫助我們接觸更多的開發者。",
    mobile: "您可以在GitHub上為我們點亮星標來支持VoltAgent。",
    link: "https://github.com/voltagent/voltagent",
  },
  AU: {
    emoji: "⭐️",
    text: "You can support VoltAgent by starring us on GitHub and help us reach more developers.",
    mobile: "You can support VoltAgent by starring us on GitHub.",
    link: "https://github.com/voltagent/voltagent",
  },
  CN: {
    emoji: "⭐️",
    text: "您可以在GitHub上为VoltAgent点亮星标，帮助我们接触更多的开发者。",
    mobile: "您可以在GitHub上为我们点亮星标来支持VoltAgent。",
    link: "https://github.com/voltagent/voltagent",
  },
  KR: {
    emoji: "⭐️",
    text: "GitHub에서 별을 주시면 VoltAgent를 지원하실 수 있으며, 더 많은 개발자들과 만날 수 있도록 도와주실 수 있습니다.",
    mobile: "GitHub에서 별을 주시면 VoltAgent를 지원하실 수 있습니다.",
    link: "https://github.com/voltagent/voltagent",
  },
  CA: {
    emoji: "⭐️",
    text: "You can support VoltAgent by starring us on GitHub and help us reach more developers.",
    mobile: "You can support VoltAgent by starring us on GitHub.",
    link: "https://github.com/voltagent/voltagent",
  },
  FR: {
    emoji: "⭐️",
    text: "Vous pouvez soutenir VoltAgent en nous donnant une étoile sur GitHub et nous aider à atteindre plus de développeurs.",
    mobile:
      "Vous pouvez soutenir VoltAgent en nous donnant une étoile sur GitHub.",
    link: "https://github.com/voltagent/voltagent",
  },
  NL: {
    emoji: "⭐️",
    text: "U kunt VoltAgent steunen door ons een ster te geven op GitHub en ons helpen meer ontwikkelaars te bereiken.",
    mobile: "U kunt VoltAgent steunen door ons een ster te geven op GitHub.",
    link: "https://github.com/voltagent/voltagent",
  },
  AR: {
    emoji: "⭐️",
    text: "Puedes apoyar a VoltAgent dándonos una estrella en GitHub y ayudarnos a llegar a más desarrolladores.",
    mobile: "Puedes apoyar a VoltAgent dándonos una estrella en GitHub.",
    link: "https://github.com/voltagent/voltagent",
  },
  ES: {
    emoji: "⭐️",
    text: "Puedes apoyar a VoltAgent dándonos una estrella en GitHub y ayudarnos a llegar a más desarrolladores.",
    mobile: "Puedes apoyar a VoltAgent dándonos una estrella en GitHub.",
    link: "https://github.com/voltagent/voltagent",
  },
  IT: {
    emoji: "⭐️",
    text: "Puoi supportare VoltAgent mettendo una stella su GitHub e aiutarci a raggiungere più sviluppatori.",
    mobile: "Puoi supportare VoltAgent mettendo una stella su GitHub.",
    link: "https://github.com/voltagent/voltagent",
  },
  TH: {
    emoji: "⭐️",
    text: "คุณสามารถสนับสนุน VoltAgent ได้ด้วยการให้ดาวบน GitHub และช่วยให้เราเข้าถึงนักพัฒนาเพิ่มขึ้น",
    mobile: "คุณสามารถสนับสนุน VoltAgent ได้ด้วยการให้ดาวบน GitHub",
    link: "https://github.com/voltagent/voltagent",
  },
  RU: {
    emoji: "⭐️",
    text: "Вы можете поддержать VoltAgent, поставив звезду на GitHub и помочь нам охватить больше разработчиков.",
    mobile: "Вы можете поддержать VoltAgent, поставив звезду на GitHub.",
    link: "https://github.com/voltagent/voltagent",
  },
  PT: {
    emoji: "⭐️",
    text: "Você pode apoiar o VoltAgent dando uma estrela no GitHub e nos ajudar a alcançar mais desenvolvedores.",
    mobile: "Você pode apoiar o VoltAgent dando uma estrela no GitHub.",
    link: "https://github.com/voltagent/voltagent",
  },
  PH: {
    emoji: "⭐️",
    text: "Maaari mong suportahan ang VoltAgent sa pamamagitan ng pagbibigay ng bituin sa GitHub at tulungan kaming maabot ang mas maraming developer.",
    mobile:
      "Maaari mong suportahan ang VoltAgent sa pamamagitan ng pagbibigay ng bituin sa GitHub.",
    link: "https://github.com/voltagent/voltagent",
  },
  default: {
    emoji: "⭐️",
    text: "You can support VoltAgent by starring us on GitHub and help us reach more developers.",
    mobile: "You can support VoltAgent by starring us on GitHub.",
    link: "https://github.com/voltagent/voltagent",
  },
};

export default function DynamicAnnouncement(): JSX.Element | null {
  const [country, setCountry] = useState<string>("default");
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Check if announcement was previously closed
    const isAnnouncementClosed = localStorage.getItem(
      "voltagent-announcement-closed",
    );
    if (isAnnouncementClosed === "true") {
      setIsVisible(false);
      return;
    }

    // Fetch user's country in background
    fetch("https://love.voltagent.dev/api/country")
      .then((response) => response.json())
      .then((data) => {
        setCountry(data.country || "default");
      })
      .catch((error) => {
        console.error("Failed to fetch country:", error);
        setCountry("default");
      });
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem("voltagent-announcement-closed", "true");
  };

  if (!isVisible) {
    return null;
  }

  const content = announcementContent[country] || announcementContent.default;

  return (
    <div className="bg-emerald-500 text-gray-900 text-center py-2 landing-md:py-0 px-4 relative z-50 text-sm font-medium border-b border-white/10">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="w-8" />
        <a
          href={content.link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-900 !no-underline flex items-center gap-2 transition-opacity duration-200 hover:text-gray-700 hover:!no-underline hover:opacity-90"
        >
          <span>{content.emoji}</span>
          <span className="hidden md:inline">{content.text}</span>
          <span className="md:hidden">{content.mobile}</span>
        </a>
        <button
          type="button"
          className="bg-transparent border-none text-gray-900 text-lg font-bold cursor-pointer py-1 px-2 rounded transition-colors duration-200 hover:bg-white/10 focus:outline-2 focus:outline-gray-700/50 focus:outline-offset-2 w-8 flex items-center justify-center"
          onClick={handleClose}
          aria-label="Close announcement"
        >
          ×
        </button>
      </div>
    </div>
  );
}
