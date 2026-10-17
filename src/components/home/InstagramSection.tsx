import { Button } from "@/components/ui/button";
import instaOne from "@/assets/instagram-one.webp";
import instaTwo from "@/assets/instagram-two.webp";
import instaThree from "@/assets/instagram-three.webp";
import instaFour from "@/assets/instagram-four.webp";
import { useWhatsAppRedirect } from "@/hooks/useWhatsAppRedirect";

export function InstagramSection() {
  const images = [instaOne, instaTwo, instaThree, instaFour];
  const { redirectToWhatsApp } = useWhatsAppRedirect();

  const handleInstaClick = (e: React.MouseEvent, postIndex?: number) => {
    e.preventDefault();
    redirectToWhatsApp("instagram", postIndex ? `Post #${postIndex}` : undefined);
  };

  return (
    <section className="instagram-section">
      <div className="section-inner">
        <h2>
          SEGUE LÁ NO <span>INSTA!</span>
        </h2>
        <div className="instagram-grid">
          {images.map((image, index) => (
            <a
              href="#instagram"
              key={image}
              onClick={(e) => handleInstaClick(e, index + 1)}
            >
              <img
                src={image}
                alt={`Bolada Pix — publicação ${index + 1}`}
                loading="lazy"
              />
            </a>
          ))}
        </div>
        <Button variant="community" onClick={(e) => handleInstaClick(e)}>
          SEGUIR
        </Button>
      </div>
    </section>
  );
}
