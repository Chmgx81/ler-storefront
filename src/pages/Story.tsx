import { Link } from 'react-router-dom';
import { ArrowRight } from '../components/Icons';

const steps = [
  {
    title: 'Clay',
    copy: 'A coarse, warm-toned stoneware from a small yard in Jutland. Wedged by hand until it feels even.',
  },
  {
    title: 'Wheel',
    copy: 'Each piece is thrown on the wheel, one at a time. Rims are rolled, feet are turned, handles are pulled.',
  },
  {
    title: 'Glaze',
    copy: 'Glazes are mixed in the studio and applied by eye. Ivory, olive, rust and honey, with the clay showing through.',
  },
  {
    title: 'Fire',
    copy: 'A slow firing to 1,260°C. The kiln decides the last part: speckle, pooling, and the occasional surprise.',
  },
];

export default function Story() {
  return (
    <main id="top" className="story-page">
      <section className="story-hero">
        <div className="story-hero-copy">
          <h1>
            A small studio,
            <br />
            a slow process.
          </h1>
          <p className="story-lede">
            LER began in 2018 with a second-hand wheel, a bag of clay and a table that was never quite big
            enough. We still work the same way: in small runs, by hand, with time to get it right.
          </p>
        </div>
        <div className="story-hero-media">
          <img
            src="/editorial/vase-scene.webp"
            alt="A honey-coloured vase and stoneware cups on a linen-covered table in the studio"
            width="768"
            height="1376"
            fetchPriority="high"
          />
        </div>
      </section>

      <section className="container story-intro" data-reveal>
        <div>
          <h2>Useful first, beautiful because of it.</h2>
        </div>
        <div>
          <p>
            We make stoneware for the table, not for the shelf. Plates that take a proper dinner, mugs that
            sit well in the hand, a teapot that pours without a puddle. The shapes are simple because simple
            shapes get used.
          </p>
          <p>
            Everything is thrown and glazed in our studio in Copenhagen. There are four of us, a kiln that
            takes a day to cool, and a shelf of pieces that didn’t make it. The seconds go to neighbours
            first.
          </p>
        </div>
      </section>

      <section className="story-images container" data-reveal>
        <figure>
          <img src="/editorial/studio-group.webp" alt="A group of stoneware mugs and cups drying on a table" loading="lazy" />
          <figcaption>Fresh from the wheel, waiting to be trimmed.</figcaption>
        </figure>
        <figure>
          <img src="/editorial/flatlay.webp" alt="An overhead view of plates and cups laid out on linen" loading="lazy" />
          <figcaption>A table set for a long lunch.</figcaption>
        </figure>
      </section>

      <section className="process" id="process">
        <div className="container">
          <header className="section-head" data-reveal>
            <div>
              <h2>From clay to table</h2>
              <p className="section-sub">Four stages, none of them rushed.</p>
            </div>
          </header>
          <div className="process-grid">
            {steps.map((s, i) => (
              <article key={s.title} data-reveal style={{ ['--d' as string]: `${i * 80}ms` }}>
                <h3>{s.title}</h3>
                <p>{s.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="quote-band story-quote" data-reveal>
        <div className="container quote-inner">
          <span className="quote-mark" aria-hidden="true">
            “
          </span>
          <blockquote>We don’t chase perfect. We chase the piece you want to pick up again tomorrow.</blockquote>
          <p className="quote-cite">Inger Holm, founder and potter</p>
        </div>
      </section>

      <section className="container story-notes">
        <div className="story-note" id="care">
          <h2>Care</h2>
          <p>
            Every piece is dishwasher safe on a gentle cycle. For the longest life, wash by hand, avoid
            sudden temperature changes, and let it dry upside down. Stoneware is tough, but it dislikes a
            cold shock.
          </p>
        </div>
        <div className="story-note" id="shipping">
          <h2>Shipping &amp; returns</h2>
          <p>
            Orders leave the studio within 2–3 working days. Standard shipping is free over $120; express is
            available at checkout. If a piece isn’t right, send it back unused within 30 days and we’ll
            refund it.
          </p>
        </div>
      </section>

      <section className="container story-cta" data-reveal>
        <h2>Come see the collection.</h2>
        <Link to="/shop" className="btn">
          Shop all pieces <ArrowRight />
        </Link>
      </section>
    </main>
  );
}
