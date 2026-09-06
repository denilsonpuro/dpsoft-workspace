"use client";
import { useLocale } from "./locale";
import { guideCopy } from "./product-guide-copy";
export function ProductGuide() {
  const { language } = useLocale();
  const copy = guideCopy[language];
  return <>
    <section className="public-section product-guide" id="how-it-works"><div className="section-intro"><span className="public-kicker">DPSOFT / GUIDE</span><h2>{copy.title}</h2><p>{copy.intro}</p></div><article className="guide-value"><h3>{copy.valueTitle}</h3><p>{copy.value}</p></article><h3>{copy.stepsTitle}</h3><ol className="guide-steps">{copy.steps.map((step, index) => <li key={step}><span aria-hidden="true">0{index + 1}</span><p>{step}</p></li>)}</ol></section>
    <section className="public-section product-guide" id="installation"><h2>{copy.installTitle}</h2><div className="guide-install"><article><h3>Web</h3><p>{copy.web}</p></article><article><h3>macOS CLI</h3><p>{copy.mac}</p><a href="https://github.com/denilsonpuro/dpsoft-workspace/blob/main/docs/macos-connector.md" target="_blank" rel="noopener noreferrer">{copy.docs} ↗</a></article><article><h3>Mobile</h3><p>{copy.mobile}</p></article></div></section>
    <section className="public-section guide-security" id="security"><h2>{copy.securityTitle}</h2><p>{copy.security}</p></section>
  </>;
}
export function ProductFaq() {
  const { language } = useLocale();
  const copy = guideCopy[language];
  return <section className="public-faq" id="faq"><div><span className="public-kicker">DPSOFT / FAQ</span><h2>{copy.faqTitle}</h2></div><div>{copy.faq.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></section>;
}
