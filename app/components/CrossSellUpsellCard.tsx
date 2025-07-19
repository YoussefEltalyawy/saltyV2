import { useState, useEffect } from 'react';
import { useAside } from './Aside';
import { AddToCartButton } from './AddToCartButton';

function CrossSellUpsellCard({ currentProduct, complementaryProducts, upsell }: {
  currentProduct: any;
  complementaryProducts: any[];
  upsell: any;
}) {
  const { title, description, discountValue } = upsell;
  const { open } = useAside();
  const [error, setError] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [selectedOptions, setSelectedOptions] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (complementaryProducts.length > 0 && !selectedProduct) {
      const product = complementaryProducts[0];
      setSelectedProduct(product);
      if (product.variants.nodes.length > 0) {
        const firstVariant = product.variants.nodes[0];
        setSelectedVariantId(firstVariant.id);
        setSelectedVariant(firstVariant);
        const initialOptions: { [key: string]: string } = {};
        firstVariant.selectedOptions.forEach((option: any) => {
          initialOptions[option.name] = option.value;
        });
        setSelectedOptions(initialOptions);
      }
    }
  }, [complementaryProducts, selectedProduct]);

  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const productHandle = e.target.value;
    const product = complementaryProducts.find(p => p.handle === productHandle);
    if (product) {
      setSelectedProduct(product);
      if (product.variants.nodes.length > 0) {
        const firstVariant = product.variants.nodes[0];
        setSelectedVariantId(firstVariant.id);
        setSelectedVariant(firstVariant);
        const initialOptions: { [key: string]: string } = {};
        firstVariant.selectedOptions.forEach((option: any) => {
          initialOptions[option.name] = option.value;
        });
        setSelectedOptions(initialOptions);
      } else {
        setSelectedVariantId(null);
        setSelectedVariant(null);
        setSelectedOptions({});
      }
    }
  };

  const handleOptionChange = (name: string, value: string) => {
    const newOptions = { ...selectedOptions, [name]: value };
    setSelectedOptions(newOptions);
    if (selectedProduct) {
      const matchingVariant = selectedProduct.variants.nodes.find((variant: any) => {
        return variant.selectedOptions.every((option: any) => {
          return newOptions[option.name] === option.value;
        });
      });
      if (matchingVariant) {
        setSelectedVariantId(matchingVariant.id);
        setSelectedVariant(matchingVariant);
      }
    }
  };

  const getProductOptions = () => {
    if (!selectedProduct || !selectedProduct.options) return [];
    return selectedProduct.options;
  };

  const getOptionValues = (optionName: string) => {
    const option = selectedProduct?.options?.find((opt: any) => opt.name === optionName);
    return option && option.optionValues ? option.optionValues.map((v: any) => v.name) : [];
  };

  // Color swatch helper
  const getSwatchColor = (product: any, color: string): string | undefined => {
    if (!product?.options) return undefined;
    const colorOption = product.options.find((opt: any) => opt.name.toLowerCase() === 'color');
    if (!colorOption || !colorOption.optionValues) return undefined;
    const value = colorOption.optionValues.find((v: any) => v.name === color);
    return value?.swatch?.color;
  };

  const lines = [];
  if (currentProduct.selectedOrFirstAvailableVariant?.id) {
    lines.push({
      merchandiseId: currentProduct.selectedOrFirstAvailableVariant.id,
      quantity: 1
    });
  }
  if (selectedVariantId) {
    lines.push({
      merchandiseId: selectedVariantId,
      quantity: 1
    });
  }

  const handleClick = () => {
    if (!selectedVariantId) {
      setError('Please select a product to complete the bundle.');
      return false;
    }
    setError('');
    open('cart');
    return true;
  };

  const calculatePrices = () => {
    if (!currentProduct.selectedOrFirstAvailableVariant?.price || !selectedVariant?.price) {
      return { original: 0, discounted: 0 };
    }
    const currentProductPrice = parseFloat(currentProduct.selectedOrFirstAvailableVariant.price.amount);
    const complementaryProductPrice = parseFloat(selectedVariant.price.amount);
    const originalTotal = currentProductPrice + complementaryProductPrice;
    const discountedTotal = originalTotal * (1 - discountValue / 100);
    return {
      original: originalTotal,
      discounted: discountedTotal,
      currencyCode: currentProduct.selectedOrFirstAvailableVariant.price.currencyCode
    };
  };
  const prices = calculatePrices();

  return (
    <div className="mb-4 border border-gray-200 p-6">
      <h2 className="text-2xl font-medium text-black mb-2">{title}</h2>
      <p className="mb-6 text-gray-700">{description}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current product */}
        <div className="flex flex-col border border-gray-100 p-3">
          <h3 className="text-sm font-medium mb-2">Current Selection</h3>
          <div className="w-full aspect-square mb-3 bg-gray-100 max-h-48">
            {currentProduct.selectedOrFirstAvailableVariant?.image?.url ? (
              <img
                src={currentProduct.selectedOrFirstAvailableVariant.image.url}
                alt={currentProduct.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-gray-400 text-xs">No image available</span>
              </div>
            )}
          </div>
          <div className="text-sm font-medium">{currentProduct.title}</div>
          <div className="text-xs text-gray-500 mt-1">
            {(currentProduct.selectedOrFirstAvailableVariant?.selectedOptions ?? []).map((option: any) => (
              <span key={option.name}>{option.name}: {option.value} </span>
            ))}
          </div>
          <div className="mt-2 text-sm font-medium">
            {currentProduct.selectedOrFirstAvailableVariant?.price?.amount} {currentProduct.selectedOrFirstAvailableVariant?.price?.currencyCode}
          </div>
        </div>
        {/* Complementary product selection */}
        <div className="flex flex-col border border-gray-100 p-3">
          <h3 className="text-sm font-medium mb-2">Choose a complementary item</h3>
          <select
            className="border border-gray-300 rounded px-2 py-1 mb-3 text-sm"
            onChange={handleProductChange}
            value={selectedProduct?.handle || ''}
          >
            {(complementaryProducts ?? []).map((product: any) => (
              <option key={product.handle} value={product.handle}>
                {product.title}
              </option>
            ))}
          </select>
          {selectedProduct && (
            <>
              <div className="w-full aspect-square mb-3 bg-gray-100 max-h-48">
                {selectedVariant?.image?.url ? (
                  <img
                    src={selectedVariant.image.url}
                    alt={selectedProduct.title}
                    className="w-full h-full object-cover"
                  />
                ) : selectedProduct.featuredImage?.url ? (
                  <img
                    src={selectedProduct.featuredImage.url}
                    alt={selectedProduct.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-gray-400 text-xs">No image available</span>
                  </div>
                )}
              </div>
              <div className="text-sm font-medium">{selectedProduct.title}</div>
              {/* Variant options */}
              {getProductOptions().map((option: any) => (
                <div key={option.name} className="product-options mb-3">
                  <h5 className="text-xs font-medium text-gray-900 mb-2">{option.name}</h5>
                  <div className="flex flex-wrap gap-2 justify-start">
                    {(getOptionValues(option.name) ?? []).map((value: string) => {
                      // Color swatch logic
                      if (option.name.toLowerCase() === 'color') {
                        // Find the variant for this color and current size
                        const swatchColor = getSwatchColor(selectedProduct, value);
                        const variant = selectedProduct.variants.nodes.find((v: any) =>
                          v.selectedOptions.some((opt: any) => opt.name.toLowerCase() === 'color' && opt.value === value) &&
                          v.selectedOptions.some((opt: any) => opt.name.toLowerCase() === 'size' && opt.value === selectedOptions['Size'])
                        );
                        const outOfStock = variant ? !variant.availableForSale : false;
                        return (
                          <button
                            key={value}
                            type="button"
                            className={`product-options-item transition-all w-6 h-6 flex items-center justify-center p-0 color-swatch relative
                              ${selectedOptions[option.name] === value
                                ? 'border-2 border-gray-900'
                                : 'border border-gray-200 hover:border-gray-400'
                              }
                              ${outOfStock ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                            onClick={() => !outOfStock && handleOptionChange(option.name, value)}
                            style={{ borderRadius: '0' }}
                            disabled={outOfStock}
                          >
                            {swatchColor ? (
                              <div
                                aria-label={value}
                                className="w-full h-full relative"
                                style={{
                                  backgroundColor: swatchColor,
                                  padding: 0,
                                  margin: 0,
                                  display: 'block',
                                }}
                              >
                                {outOfStock && (
                                  <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <svg width="100%" height="100%" viewBox="0 0 24 24" className="absolute inset-0">
                                      <line x1="4" y1="20" x2="20" y2="4" stroke="#b91c1c" strokeWidth="2.5" strokeLinecap="round" />
                                    </svg>
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div
                                aria-label={value}
                                className="w-full h-full relative bg-gray-200"
                                style={{
                                  padding: 0,
                                  margin: 0,
                                  display: 'block',
                                }}
                              >
                                {outOfStock && (
                                  <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <svg width="100%" height="100%" viewBox="0 0 24 24" className="absolute inset-0">
                                      <line x1="4" y1="20" x2="20" y2="4" stroke="#b91c1c" strokeWidth="2.5" strokeLinecap="round" />
                                    </svg>
                                  </span>
                                )}
                              </div>
                            )}
                          </button>
                        );
                      } else {
                        // Size button logic
                        const variant = selectedProduct.variants.nodes.find((v: any) =>
                          v.selectedOptions.some((opt: any) => opt.name.toLowerCase() === 'color' && opt.value === selectedOptions['Color']) &&
                          v.selectedOptions.some((opt: any) => opt.name.toLowerCase() === 'size' && opt.value === value)
                        );
                        const outOfStock = variant ? !variant.availableForSale : false;
                        return (
                          <button
                            key={value}
                            type="button"
                            className={`product-options-item transition-all px-2 py-1 text-xs font-medium relative
                              ${selectedOptions[option.name] === value
                                ? 'text-gray-900 underline underline-offset-4'
                                : 'text-gray-600 hover:text-gray-900'
                              }
                              ${outOfStock ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                            onClick={() => !outOfStock && handleOptionChange(option.name, value)}
                            disabled={outOfStock}
                          >
                            {value}
                          </button>
                        );
                      }
                    })}
                  </div>
                </div>
              ))}
              <div className="mt-2 text-sm font-medium">
                {selectedVariant?.price?.amount} {selectedVariant?.price?.currencyCode}
              </div>
            </>
          )}
        </div>
      </div>
      {/* Bundle pricing */}
      <div className="mt-6 text-center">
        <div className="text-lg font-medium">Bundle Price:</div>
        <div className="flex items-center justify-center gap-2">
          <span className="text-gray-500 line-through">
            {prices.original.toFixed(2)} {prices.currencyCode}
          </span>
          <span className="text-xl font-bold">
            {prices.discounted.toFixed(2)} {prices.currencyCode}
          </span>
          <span className="text-green-600 text-sm">
            (Save {discountValue}%)
          </span>
        </div>
      </div>
      {error && <div className="text-red-600 mt-4 text-sm text-center">{error}</div>}
      <div className="mt-6">
        <AddToCartButton
          disabled={lines.length < 2}
          lines={lines}
          onClick={handleClick}
        >
          <span className="block w-full text-center py-3 px-6 tracking-wide text-base font-medium transition-all duration-200 bg-black text-white hover:bg-gray-800 active:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed">
            Add Bundle to Cart
          </span>
        </AddToCartButton>
      </div>
      <div className="text-xs text-gray-500 mt-2 text-center">Discount applied automatically at checkout.</div>
    </div>
  );
}

export default CrossSellUpsellCard; 