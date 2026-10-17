import { Button } from "@/components/ui/button";
import instaOne from "@/assets/instagram-one.webp";
import instaTwo from "@/assets/instagram-two.webp";
import instaThree from "@/assets/instagram-three.webp";
import instaFour from "@/assets/instagram-four.webp";
import { original, instagram } from "@/lib/constants";

export function InstagramSection() {
  const images = [instaOne, instaTwo, instaThree, instaFour];

  return (
    <section className="instagram-section">
      <div className="section-inner">
        <h2>
          SEGUE LÁ NO <span>INSTA!</span>
        </h2>
        <div className="instagram-grid">
          {images.map((image, index) => (
            <a href={original} key={image}>
              <img
                src={image}
                alt={`Bolada Pix — publicação ${index + 1}`}
                loading="lazy"
              />
            </a>
          ))}
        </div>
        <Button asChild variant="community">
          <a href={instagram} target="_blank" rel="noreferrer">
            SEGUIR
          </a>
        </Button>
      </div>
    </section>
  );
}
