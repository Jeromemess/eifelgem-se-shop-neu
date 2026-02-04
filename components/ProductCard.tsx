
import React from 'react';
import { Product } from '../types';
import { Plus, Minus, Tag, Zap } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  quantityInCart: number;
  onUpdateQuantity: (newQuantity: number) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, quantityInCart, onUpdateQuantity }) => {
  const isOutOfStock = product.stockQuantity === 0;
  
  // Berechnung des angezeigten Preises
  const originalPrice = product.pricePerUnit;
  const hasDiscount = (product.discount || 0) > 0;
  const currentPrice = hasDiscount 
    ? originalPrice * (1 - (product.discount || 0) / 100) 
    : originalPrice;

  const handleIncrement = () => {
    if (quantityInCart < product.stockQuantity) {
      onUpdateQuantity(quantityInCart + 1);
    }
  };

  const handleDecrement = () => {
    if (quantityInCart > 0) {
      onUpdateQuantity(quantityInCart - 1);
    }
  };

  return (
    <div className={`bg-white rounded-[2rem] shadow-sm border border-[#f2ede1] overflow-hidden flex flex-col transition-all hover:shadow-2xl hover:-translate-y-1 ${isOutOfStock ? 'opacity-60 grayscale-[0.3]' : ''}`}>
      <div className="relative h-60 w-full overflow-hidden bg-[#fdfaf3]">
        <img 
          src={product.imageUrl} 
          alt={product.name} 
          className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
          loading="lazy"
        />
        
        {/* Badges für Marketing */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {hasDiscount && (
            <div className="bg-orange-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-lg">
              <Tag className="w-3 h-3" /> -{product.discount}%
            </div>
          )}
          {product.isBogo && (
            <div className="bg-green-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-lg">
              <Zap className="w-3 h-3 fill-current" /> 1+1 GRATIS
            </div>
          )}
        </div>

        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/10 flex items-center justify-center backdrop-blur-[2px]">
            <span className="bg-white text-[#1a4d2e] px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-2xl border border-[#1a4d2e]/10">
              Derzeit leergeerntet
            </span>
          </div>
        )}
      </div>

      <div className="p-7 flex flex-col flex-grow">
        <div className="mb-4">
          <h3 className="font-[900] text-[#121a14] text-xl leading-tight mb-1 tracking-tight uppercase">{product.name}</h3>
          <div className="flex items-center gap-2">
            <p className="text-[#1a4d2e] font-black text-lg flex items-center gap-1">
              <span className="bg-[#1a4d2e]/5 px-2 py-0.5 rounded-lg border border-[#1a4d2e]/10">
                {currentPrice.toFixed(2)} €
              </span>
              {hasDiscount && (
                <span className="text-gray-300 line-through text-xs font-bold ml-1">
                  {originalPrice.toFixed(2)} €
                </span>
              )}
            </p>
            <span className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">/ {product.unit}</span>
          </div>
        </div>
        
        {product.description && (
          <p className="text-gray-500 text-xs leading-relaxed mb-6 line-clamp-2 font-medium">{product.description}</p>
        )}

        <div className="mt-auto flex items-center justify-between gap-4">
          <div className="flex items-center bg-[#fdfaf3] border border-[#f2ede1] rounded-2xl p-1.5 shadow-inner">
            <button
              onClick={handleDecrement}
              disabled={quantityInCart === 0 || isOutOfStock}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-[#1a4d2e] hover:bg-white disabled:opacity-20 transition-all active:scale-90"
            >
              <Minus className="w-4 h-4" />
            </button>
            
            <span className="font-black text-lg text-[#121a14] w-10 text-center tabular-nums">
              {quantityInCart}
            </span>

            <button
              onClick={handleIncrement}
              disabled={quantityInCart >= product.stockQuantity || isOutOfStock}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-[#1a4d2e] hover:bg-white disabled:opacity-20 transition-all active:scale-90"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="text-[9px] font-black uppercase tracking-[0.15em] text-[#88a270] bg-[#88a270]/5 px-3 py-1 rounded-full border border-[#88a270]/10">
             {isOutOfStock ? '0 auf Lager' : `${product.stockQuantity} verfügbar`}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
