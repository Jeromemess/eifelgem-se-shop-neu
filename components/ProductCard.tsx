
import React, { memo, useState } from 'react';
import { Product } from '../types';
import { Plus, Minus, Tag, Zap, Sprout } from 'lucide-react';
import { calcUnitPrice } from '../utils/price';

interface ProductCardProps {
  product: Product;
  quantityInCart: number;
  onUpdateQuantity: (newQuantity: number) => void;
}

const ProductCard: React.FC<ProductCardProps> = memo(({ product, quantityInCart, onUpdateQuantity }) => {
  const [imgError, setImgError] = useState(false);
  const isOutOfStock  = product.stockQuantity === 0;
  const hasDiscount   = (product.discount || 0) > 0;
  const currentPrice  = calcUnitPrice(product);

  return (
    <div
      className={`bg-white rounded-[2.5rem] overflow-hidden flex flex-col transition-all hover:-translate-y-1 ${isOutOfStock ? 'opacity-60 grayscale-[0.3]' : ''}`}
      style={{ boxShadow: '0 2px 10px rgba(0,40,32,.08)', border: '1px solid var(--eifel-beige-dark)' }}
    >
      {/* Bild */}
      <div className="relative h-44 sm:h-56 w-full overflow-hidden" style={{ backgroundColor: 'var(--eifel-beige)' }}>
        {imgError || !product.imageUrl ? (
          <div className="w-full h-full flex items-center justify-center">
            <Sprout className="w-12 h-12 opacity-20" style={{ color: 'var(--eifel-dark)' }} />
          </div>
        ) : (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {hasDiscount && (
            <span className="text-white px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-widest flex items-center gap-1 shadow" style={{ backgroundColor: 'var(--eifel-orange)' }}>
              <Tag className="w-3 h-3" /> -{product.discount}%
            </span>
          )}
          {product.isBogo && (
            <span className="text-white px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-widest flex items-center gap-1 shadow" style={{ backgroundColor: 'var(--eifel-teal)' }}>
              <Zap className="w-3 h-3 fill-current" /> 1+1 GRATIS
            </span>
          )}
        </div>

        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/10 flex items-center justify-center backdrop-blur-[2px]">
            <span className="bg-white px-5 py-2 text-[10px] font-semibold uppercase tracking-widest rounded-full shadow-lg" style={{ color: 'var(--eifel-dark)', border: '1px solid rgba(0,80,64,0.1)' }}>
              Abgeerntet!
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-5 sm:p-7 flex flex-col flex-grow">
        <div className="mb-4">
          <h3 className="font-display font-semibold text-lg leading-tight mb-1" style={{ color: 'var(--eifel-dark)' }}>{product.name}</h3>

          {product.description && (
            <p className="text-sm mb-2 leading-snug" style={{ color: 'var(--eifel-text-muted)' }}>
              {product.description}
            </p>
          )}

          <div className="flex items-end gap-2">
            <div className="flex flex-col">
              {(hasDiscount || product.isBogo) && (
                <span className="text-gray-300 line-through text-[10px] font-medium leading-none mb-1 tabular-nums">
                  {product.pricePerUnit.toFixed(2)} €
                </span>
              )}
              <p className="font-bold text-2xl leading-none" style={{ color: 'var(--eifel-dark)' }}>
                {currentPrice.toFixed(2)} €
              </p>
            </div>
            <span className="font-medium text-[10px] uppercase tracking-widest mb-0.5" style={{ color: 'var(--eifel-text-muted)' }}>/ {product.unit}</span>
          </div>
        </div>

        {/* Mengenregler */}
        <div className="mt-auto flex items-center justify-between gap-3">
          <div className="flex items-center rounded-2xl p-1" style={{ backgroundColor: 'var(--eifel-beige)', border: '1px solid var(--eifel-beige-darker)' }}>
            <button
              onClick={() => quantityInCart > 0 && onUpdateQuantity(quantityInCart - 1)}
              disabled={quantityInCart === 0 || isOutOfStock}
              aria-label="Weniger"
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 disabled:opacity-30"
              style={{ color: 'var(--eifel-text-muted)' }}
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="font-bold text-lg w-9 text-center tabular-nums" style={{ color: 'var(--eifel-text)' }}>{quantityInCart}</span>
            <button
              onClick={() => quantityInCart < product.stockQuantity && onUpdateQuantity(quantityInCart + 1)}
              disabled={quantityInCart >= product.stockQuantity || isOutOfStock}
              aria-label="Mehr"
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 disabled:opacity-30"
              style={{ color: 'var(--eifel-text-muted)' }}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="text-[9px] font-semibold uppercase tracking-widest px-3 py-1 rounded-full" style={{ color: 'var(--eifel-dark)', backgroundColor: 'rgba(0,80,64,0.06)', border: '1px solid rgba(0,80,64,0.1)' }}>
            {isOutOfStock ? 'Leer' : `${product.stockQuantity} am Acker`}
          </div>
        </div>
      </div>
    </div>
  );
});

ProductCard.displayName = 'ProductCard';
export default ProductCard;
