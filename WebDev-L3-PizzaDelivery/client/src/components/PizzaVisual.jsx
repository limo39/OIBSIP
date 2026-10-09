import { useState } from 'react';

// High-quality pizza images from Unsplash
// These are real pizza photos that match different styles
const PIZZA_IMAGES = [
  'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&h=600&fit=crop', // Classic margherita
  'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&h=600&fit=crop', // Pepperoni style
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=600&fit=crop', // Veggie loaded
  'https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=600&h=600&fit=crop', // Gourmet style
  'https://images.unsplash.com/photo-1595854341625-f33ee10dbf94?w=600&h=600&fit=crop', // Cheese pizza
  'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=600&h=600&fit=crop', // BBQ style
  'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600&h=600&fit=crop', // Supreme pizza
  'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=600&h=600&fit=crop', // Neapolitan
  'https://images.unsplash.com/photo-1590947132387-155cc02f3212?w=600&h=600&fit=crop', // Mushroom pizza
  'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=600&h=600&fit=crop', // Artisan pizza
  'https://images.unsplash.com/photo-1588315029754-2dd089d39a1a?w=600&h=600&fit=crop', // Thin crust
  'https://images.unsplash.com/photo-1601924582970-9238bcb495d9?w=600&h=600&fit=crop', // White pizza
];

// Map pizza configurations to real pizza images
function getPizzaImage(baseSlug, sauceSlug, cheeseSlug, vegetableSlugs = []) {
  if (!baseSlug) {
    return null;
  }
  
  // Create a consistent hash from the ingredients
  const ingredientHash = [baseSlug, sauceSlug, cheeseSlug, ...vegetableSlugs.sort()].join('-');
  const hashCode = ingredientHash.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  // Select image based on hash for consistency
  const imageIndex = Math.abs(hashCode) % PIZZA_IMAGES.length;
  return PIZZA_IMAGES[imageIndex];
}

export default function PizzaVisual({
  baseSlug,
  sauceSlug,
  cheeseSlug,
  vegetableSlugs = [],
  className = '',
}) {
  const [imageError, setImageError] = useState(false);
  const imageUrl = getPizzaImage(baseSlug, sauceSlug, cheeseSlug, vegetableSlugs);

  if (!imageUrl || imageError) {
    return (
      <div 
        className={`${className} flex items-center justify-center bg-gradient-to-br from-amber-100 to-orange-200 rounded-full aspect-square border-8 border-amber-800/20 shadow-xl`}
        role="img" 
        aria-label="Pizza preview"
      >
        <div className="text-center p-8">
          <div className="text-6xl mb-3">🍕</div>
          <p className="text-amber-900 font-serif text-lg">
            {!baseSlug ? 'Choose your base to start' : 'Building your pizza...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} relative`} role="img" aria-label="Pizza preview">
      <div className="relative rounded-full overflow-hidden aspect-square border-8 border-amber-800/30 shadow-2xl bg-amber-100">
        <img
          src={imageUrl}
          alt="Pizza preview"
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
          loading="lazy"
        />
        {/* Overlay to show it's building */}
        {baseSlug && (!sauceSlug || !cheeseSlug) && (
          <div className="absolute inset-0 bg-black/10 flex items-center justify-center backdrop-blur-[1px]">
            <div className="bg-white/95 px-6 py-3 rounded-full shadow-lg">
              <p className="text-sm font-medium text-amber-900">Keep building...</p>
            </div>
          </div>
        )}
      </div>
      {/* Pizza board shadow effect */}
      <div className="absolute inset-x-0 -bottom-4 h-8 bg-gradient-to-b from-transparent to-black/5 rounded-full blur-md -z-10" />
    </div>
  );
}
