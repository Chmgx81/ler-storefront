import { Link, useParams } from 'react-router-dom';
import { ArrowRight } from '../components/Icons';

type Topic = 'privacy' | 'terms' | 'shipping-returns';

const CONTENT: Record<Topic, { title: string; intro: string; sections: { h: string; body: string[] }[] }> = {
  privacy: {
    title: 'Privacy',
    intro: 'A short, plain account of what this shop keeps and why.',
    sections: [
      {
        h: 'What we store',
        body: [
          'If you create an account, we keep your name, email address and a salted password hash. When you place an order we keep the delivery address, the pieces you chose, the amount and the time it was placed.',
          'If you subscribe to notes from the studio, we keep your email address and when you signed up. We do not sell or share any of it.',
        ],
      },
      {
        h: 'Cookies and local storage',
        body: [
          'One cookie keeps you signed in. It is essential, not a tracking cookie. Your bag is kept in your browser storage so it survives a refresh. We use no advertising or analytics trackers.',
        ],
      },
      {
        h: 'Email',
        body: [
          'Password reset and order receipt emails are only sent when an email provider is configured. Without one, links are written to a local outbox on the server. The store never sees your card details.',
        ],
      },
      {
        h: 'Your choices',
        body: [
          'Your order history is visible in your account. Deleting your account in Security also deletes your orders and newsletter subscription. You can write to hello@ler.studio with any privacy request.',
        ],
      },
    ],
  },
  terms: {
    title: 'Terms',
    intro: 'This is a design demo, and the terms reflect that.',
    sections: [
      {
        h: 'No sale takes place',
        body: [
          'Checkout is a demonstration. No payment is taken, no card details leave your browser, and no order is fulfilled. Order numbers and confirmations are for exploring the experience.',
        ],
      },
      {
        h: 'Prices',
        body: [
          'Prices are shown in US dollars and include tax. Shipping is free over $120, $8 for standard delivery below that, and $14 for express. These are sample figures, not a live rate card.',
        ],
      },
      {
        h: 'Content',
        body: [
          'LER is fictional. The product photography comes from the mock.shop catalogue and is used here for demonstration. All written copy is original.',
        ],
      },
    ],
  },
  'shipping-returns': {
    title: 'Shipping & returns',
    intro: 'The intended policy, written out. Nothing here ships in this demo.',
    sections: [
      {
        h: 'Shipping',
        body: [
          'Pieces would leave the studio within two to three working days, packed without plastic and wrapped by hand. Standard delivery takes two to three working days; express takes one to two.',
        ],
      },
      {
        h: 'Returns',
        body: [
          'Unused pieces can be returned within 30 days. Write to hello@ler.studio and we would send instructions. This is a demo, so there is no returns process to use.',
        ],
      },
      {
        h: 'Care',
        body: [
          'Dishwasher safe on a gentle cycle. For the longest life, wash by hand and avoid sudden changes in temperature.',
        ],
      },
    ],
  },
};

export default function Legal() {
  const { topic } = useParams();
  const key = (topic && topic in CONTENT ? topic : 'privacy') as Topic;
  const page = CONTENT[key];

  return (
    <main id="top" className="legal-page">
      <div className="container legal-inner">
        <h1>{page.title}</h1>
        <p className="legal-lede">{page.intro}</p>
        <div className="legal-sections">
          {page.sections.map((section) => (
            <section key={section.h}>
              <h2>{section.h}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </section>
          ))}
        </div>
        <nav className="legal-nav" aria-label="More information">
          {(Object.keys(CONTENT) as Topic[]).filter((item) => item !== key).map((item) => (
            <Link key={item} to={`/legal/${item}`} className="link-arrow">
              {CONTENT[item].title} <ArrowRight />
            </Link>
          ))}
        </nav>
      </div>
    </main>
  );
}
