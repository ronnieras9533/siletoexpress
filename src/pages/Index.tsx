
import { useState } from "react";
import { Search, ShoppingCart, User, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import FeaturedProducts from "@/components/FeaturedProducts";
import Categories from "@/components/Categories";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Hero />
      <Categories />
      <FeaturedProducts />
      <Footer />
    </div>
  );
};

export default Index;
