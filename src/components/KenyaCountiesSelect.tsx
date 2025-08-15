
import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface KenyaCountiesSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  required?: boolean;
}

const KENYA_COUNTIES = [
  'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo-Marakwet', 'Embu', 'Garissa',
  'Homa Bay', 'Isiolo', 'Kajiado', 'Kakamega', 'Kericho', 'Kiambu', 'Kilifi',
  'Kirinyaga', 'Kisii', 'Kisumu', 'Kitui', 'Kwale', 'Laikipia', 'Lamu', 'Machakos',
  'Makueni', 'Mandera', 'Marsabit', 'Meru', 'Migori', 'Mombasa', 'Murang\'a',
  'Nairobi', 'Nakuru', 'Nandi', 'Narok', 'Nyamira', 'Nyandarua', 'Nyeri',
  'Samburu', 'Siaya', 'Taita-Taveta', 'Tana River', 'Tharaka-Nithi', 'Trans Nzoia',
  'Turkana', 'Uasin Gishu', 'Vihiga', 'Wajir', 'West Pokot'
];

const KenyaCountiesSelect: React.FC<KenyaCountiesSelectProps> = ({ value, onValueChange, required = false }) => {
  return (
    <div>
      <Label htmlFor="county">County * {required && <span className="text-red-500">*</span>}</Label>
      <Select value={value} onValueChange={onValueChange} required={required}>
        <SelectTrigger>
          <SelectValue placeholder="Select your county" />
        </SelectTrigger>
        <SelectContent className="bg-white border border-gray-200 shadow-lg z-50 max-h-60 overflow-y-auto">
          {KENYA_COUNTIES.map((county) => (
            <SelectItem 
              key={county} 
              value={county.toLowerCase()}
              className="hover:bg-gray-100 cursor-pointer px-3 py-2"
            >
              {county}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default KenyaCountiesSelect;
