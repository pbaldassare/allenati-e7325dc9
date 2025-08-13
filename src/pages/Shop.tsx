import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Filter, 
  ShoppingCart, 
  Heart, 
  Star,
  Plus,
  Minus,
  Package,
  Truck
} from 'lucide-react';
import { useAppData } from '@/contexts/AppDataContext';
import { toast } from '@/hooks/use-toast';

const Shop = () => {
  const { products, cart, addToCart, removeFromCart, updateCartQuantity } = useAppData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = ['all', 'Integratori', 'Accessori', 'Abbigliamento', 'Attrezzature'];
  
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCartQuantity = (productId: string) => {
    const item = cart.find(item => item.productId === productId);
    return item ? item.quantity : 0;
  };

  const getTotalCartItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalCartValue = () => {
    return cart.reduce((total, item) => {
      const product = products.find(p => p.id === item.productId);
      return total + (product?.price || 0) * item.quantity;
    }, 0);
  };

  const handleAddToCart = (productId: string) => {
    addToCart(productId, 1);
    const product = products.find(p => p.id === productId);
    toast({
      title: "Prodotto aggiunto",
      description: `${product?.name} aggiunto al carrello`
    });
  };

  const handleUpdateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity === 0) {
      removeFromCart(productId);
      toast({
        title: "Prodotto rimosso",
        description: "Prodotto rimosso dal carrello"
      });
    } else {
      updateCartQuantity(productId, newQuantity);
    }
  };

  const ProductCard = ({ product }: { product: any }) => {
    const quantity = getCartQuantity(product.id);
    const isInCart = quantity > 0;

    return (
      <Card className="group hover:shadow-card transition-all duration-300">
        <CardHeader className="p-0">
          <div className="relative">
            <img 
              src={product.images[0]} 
              alt={product.name}
              className="w-full h-48 object-cover rounded-t-lg"
            />
            {product.isNew && (
              <Badge className="absolute top-2 left-2 bg-success text-white">
                Nuovo
              </Badge>
            )}
            {product.originalPrice && (
              <Badge className="absolute top-2 right-2 bg-destructive text-white">
                -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Heart className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Badge variant="outline">{product.category}</Badge>
              <div className="flex items-center space-x-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span className="text-xs text-muted-foreground">
                  {product.rating} ({product.reviews})
                </span>
              </div>
            </div>
            
            <h3 className="font-medium text-base sm:text-sm">{product.name}</h3>
            <p className="text-sm sm:text-xs text-foreground sm:text-muted-foreground line-clamp-2">
              {product.description}
            </p>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-primary text-lg sm:text-base">€{product.price}</span>
                {product.originalPrice && (
                  <span className="text-sm sm:text-xs text-muted-foreground line-through">
                    €{product.originalPrice}
                  </span>
                )}
              </div>
              <span className="text-sm sm:text-xs text-foreground sm:text-muted-foreground">
                {product.inStock} disponibili
              </span>
            </div>

            {isInCart ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUpdateQuantity(product.id, quantity - 1)}
                    className="h-8 w-8 p-0"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="text-base sm:text-sm font-medium w-8 text-center">{quantity}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUpdateQuantity(product.id, quantity + 1)}
                    className="h-8 w-8 p-0"
                    disabled={quantity >= product.inStock}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <span className="text-sm sm:text-xs font-medium text-primary">
                  €{(product.price * quantity).toFixed(2)}
                </span>
              </div>
            ) : (
                <Button
                onClick={() => handleAddToCart(product.id)}
                className="w-full bg-gradient-primary hover:opacity-90 h-11 sm:h-9"
                size="sm"
                disabled={product.inStock === 0}
              >
                <ShoppingCart className="mr-2 h-4 w-4 sm:h-3 sm:w-3" />
                {product.inStock === 0 ? 'Esaurito' : 'Aggiungi'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const CartSummary = () => (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Carrello</span>
          <Badge variant="secondary">{getTotalCartItems()} articoli</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {cart.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Il carrello è vuoto
            </p>
          ) : (
            <>
              <div className="space-y-3">
                {cart.map((item) => {
                  const product = products.find(p => p.id === item.productId);
                  if (!product) return null;
                  
                  return (
                    <div key={item.productId} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <img 
                          src={product.images[0]} 
                          alt={product.name}
                          className="w-8 h-8 rounded object-cover"
                        />
                        <div>
                          <p className="text-xs font-medium">{product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.quantity} x €{product.price}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromCart(item.productId)}
                        className="h-6 w-6 p-0"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
              
              <div className="border-t pt-4">
                <div className="flex items-center justify-between font-medium">
                  <span>Totale:</span>
                  <span className="text-primary">€{getTotalCartValue().toFixed(2)}</span>
                </div>
                <Button className="w-full mt-3 bg-gradient-primary hover:opacity-90">
                  <Package className="mr-2 h-4 w-4" />
                  Checkout
                </Button>
                <div className="flex items-center justify-center mt-2 text-xs text-muted-foreground">
                  <Truck className="mr-1 h-3 w-3" />
                  Spedizione gratuita sopra €50
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              FitShop
            </h1>
            <p className="text-muted-foreground">
              Integratori, accessori e abbigliamento fitness
            </p>
          </div>
          <Badge variant="secondary" className="relative">
            <ShoppingCart className="mr-1 h-4 w-4" />
            Carrello ({getTotalCartItems()})
          </Badge>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-6">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Cerca prodotti..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" className="shrink-0">
                <Filter className="mr-2 h-4 w-4" />
                Filtri
              </Button>
            </div>

            {/* Categories */}
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
              <TabsList className="grid w-full grid-cols-5">
                {categories.map((category) => (
                  <TabsTrigger key={category} value={category} className="text-xs">
                    {category === 'all' ? 'Tutti' : category}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {/* Products Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nessun prodotto trovato</h3>
                  <p className="text-muted-foreground">
                    Prova a modificare i filtri di ricerca
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Cart Sidebar */}
          <div className="lg:w-80">
            <CartSummary />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Shop;