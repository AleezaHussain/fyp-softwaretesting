import React from 'react';

interface CountryFormProps {
  onCountrySave?: (country: string) => void;
}

const CountryForm: React.FC<CountryFormProps> = ({ onCountrySave }) => {
  const [country, setCountry] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (onCountrySave) onCountrySave(country);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto bg-white dark:bg-[#1a1f3a] p-8 rounded-2xl shadow">
      <label htmlFor="country" className="block mb-2 font-semibold">Country Name:</label>
      <input
        id="country"
        type="text"
        value={country}
        onChange={e => setCountry(e.target.value)}
        placeholder="Enter your country"
        required
        className="w-full p-2 mb-4 border rounded"
      />
      <button type="submit" className="btn btn-primary w-full">Save</button>
      {submitted && (
        <div className="mt-4 text-green-600 dark:text-green-400">Country saved: <b>{country}</b></div>
      )}
    </form>
  );
};

export default CountryForm;
