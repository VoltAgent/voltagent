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
    text: "Support VoltAgent by starring us on GitHub. Help us reach more developers worldwide.",
    mobile: "Star us on GitHub to support VoltAgent.",
    link: "https://github.com/voltagent/voltagent",
  },
  IN: {
    emoji: "⭐️",
    text: "GitHub पर स्टार देकर VoltAgent का समर्थन करें। अधिक developers तक पहुंचने में हमारी मदद करें।",
    mobile: "GitHub पर स्टार देकर VoltAgent का समर्थन करें।",
    link: "https://github.com/voltagent/voltagent",
  },
  TR: {
    emoji: "⭐️",
    text: "GitHub'da yıldız vererek VoltAgent'ı destekleyin. Daha fazla geliştiriciye ulaşmamıza yardım edin.",
    mobile: "GitHub'da yıldız vererek VoltAgent'ı destekleyin.",
    link: "https://github.com/voltagent/voltagent",
  },
  GB: {
    emoji: "⭐️",
    text: "Support VoltAgent by starring us on GitHub. Help us reach more developers worldwide.",
    mobile: "Star us on GitHub to support VoltAgent.",
    link: "https://github.com/voltagent/voltagent",
  },
  SG: {
    emoji: "⭐️",
    text: "在GitHub上为VoltAgent加星以示支持。帮助我们接触更多的开发者。",
    mobile: "在GitHub上为我们加星以支持VoltAgent。",
    link: "https://github.com/voltagent/voltagent",
  },
  BR: {
    emoji: "⭐️",
    text: "Apoie o VoltAgent dando uma estrela no GitHub. Ajude-nos a alcançar mais desenvolvedores.",
    mobile: "Dê uma estrela no GitHub para apoiar o VoltAgent.",
    link: "https://github.com/voltagent/voltagent",
  },
  DE: {
    emoji: "⭐️",
    text: "Unterstützen Sie VoltAgent mit einem Stern auf GitHub. Helfen Sie uns, mehr Entwickler zu erreichen.",
    mobile:
      "Geben Sie uns einen Stern auf GitHub, um VoltAgent zu unterstützen.",
    link: "https://github.com/voltagent/voltagent",
  },
  VN: {
    emoji: "⭐️",
    text: "Hỗ trợ VoltAgent bằng cách để lại sao trên GitHub. Giúp chúng tôi tiếp cận nhiều developer hơn.",
    mobile: "Hãy để lại sao trên GitHub để hỗ trợ VoltAgent.",
    link: "https://github.com/voltagent/voltagent",
  },
  ID: {
    emoji: "⭐️",
    text: "Dukung VoltAgent dengan memberi bintang di GitHub. Bantu kami menjangkau lebih banyak developer.",
    mobile: "Beri kami bintang di GitHub untuk mendukung VoltAgent.",
    link: "https://github.com/voltagent/voltagent",
  },
  MX: {
    emoji: "⭐️",
    text: "Apoya a VoltAgent dándonos una estrella en GitHub. Ayúdanos a llegar a más desarrolladores.",
    mobile: "Danos una estrella en GitHub para apoyar a VoltAgent.",
    link: "https://github.com/voltagent/voltagent",
  },
  HK: {
    emoji: "⭐️",
    text: "透過在GitHub上給VoltAgent星號來支持我們。幫助我們接觸更多開發者。",
    mobile: "在GitHub上給我們星號以支持VoltAgent。",
    link: "https://github.com/voltagent/voltagent",
  },
  AU: {
    emoji: "⭐️",
    text: "Support VoltAgent by starring us on GitHub. Help us reach more developers worldwide.",
    mobile: "Star us on GitHub to support VoltAgent.",
    link: "https://github.com/voltagent/voltagent",
  },
  CN: {
    emoji: "⭐️",
    text: "在GitHub上为VoltAgent加星以示支持。帮助我们接触更多的开发者。",
    mobile: "在GitHub上为我们加星以支持VoltAgent。",
    link: "https://github.com/voltagent/voltagent",
  },
  KR: {
    emoji: "⭐️",
    text: "GitHub에서 별을 주어 VoltAgent를 지원해 주세요. 더 많은 개발자에게 다가가도록 도와주세요.",
    mobile: "GitHub에서 별을 주어 VoltAgent를 지원해 주세요.",
    link: "https://github.com/voltagent/voltagent",
  },
  CA: {
    emoji: "⭐️",
    text: "Support VoltAgent by starring us on GitHub. Help us reach more developers worldwide.",
    mobile: "Star us on GitHub to support VoltAgent.",
    link: "https://github.com/voltagent/voltagent",
  },
  FR: {
    emoji: "⭐️",
    text: "Soutenez VoltAgent en nous donnant une étoile sur GitHub. Aidez-nous à toucher plus de développeurs.",
    mobile: "Mettez une étoile sur GitHub pour soutenir VoltAgent.",
    link: "https://github.com/voltagent/voltagent",
  },
  NL: {
    emoji: "⭐️",
    text: "Steun VoltAgent door ons een ster te geven op GitHub. Help ons meer ontwikkelaars te bereiken.",
    mobile: "Geef ons een ster op GitHub om VoltAgent te steunen.",
    link: "https://github.com/voltagent/voltagent",
  },
  AR: {
    emoji: "⭐️",
    text: "Apoya a VoltAgent dándonos una estrella en GitHub. Ayúdanos a llegar a más desarrolladores.",
    mobile: "Danos una estrella en GitHub para apoyar a VoltAgent.",
    link: "https://github.com/voltagent/voltagent",
  },
  ES: {
    emoji: "⭐️",
    text: "Apoya a VoltAgent dándonos una estrella en GitHub. Ayúdanos a llegar a más desarrolladores.",
    mobile: "Danos una estrella en GitHub para apoyar a VoltAgent.",
    link: "https://github.com/voltagent/voltagent",
  },
  IT: {
    emoji: "⭐️",
    text: "Supporta VoltAgent mettendo una stella su GitHub. Aiutaci a raggiungere più sviluppatori.",
    mobile: "Metti una stella su GitHub per supportare VoltAgent.",
    link: "https://github.com/voltagent/voltagent",
  },
  TH: {
    emoji: "⭐️",
    text: "สนับสนุน VoltAgent ด้วยการให้ดาวบน GitHub ช่วยเราเข้าถึงนักพัฒนาได้มากขึ้น",
    mobile: "ให้ดาวกับเราบน GitHub เพื่อสนับสนุน VoltAgent",
    link: "https://github.com/voltagent/voltagent",
  },
  RU: {
    emoji: "⭐️",
    text: "Поддержите VoltAgent, поставив звезду на GitHub. Помогите нам охватить больше разработчиков.",
    mobile: "Поставьте нам звезду на GitHub для поддержки VoltAgent.",
    link: "https://github.com/voltagent/voltagent",
  },
  PT: {
    emoji: "⭐️",
    text: "Apoie o VoltAgent dando uma estrela no GitHub. Ajude-nos a alcançar mais desenvolvedores.",
    mobile: "Dê uma estrela no GitHub para apoiar o VoltAgent.",
    link: "https://github.com/voltagent/voltagent",
  },
  PH: {
    emoji: "⭐️",
    text: "Suportahan ang VoltAgent sa pamamagitan ng pagbibigay ng bituin sa GitHub. Tulungang maabot ang mas maraming developer.",
    mobile: "Magbigay ng bituin sa GitHub para suportahan ang VoltAgent.",
    link: "https://github.com/voltagent/voltagent",
  },
  default: {
    emoji: "⭐️",
    text: "Support VoltAgent by starring us on GitHub. Help us reach more developers worldwide.",
    mobile: "Star us on GitHub to support VoltAgent.",
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
    <div className="bg-emerald-500 text-gray-900 text-center py-2 px-4 relative z-50 text-base font-medium border-b border-white/10">
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
