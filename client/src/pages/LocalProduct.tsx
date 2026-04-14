import { useState } from "react";
import { useLocation } from "wouter";

export default function LocalProduct() {
  const [, setLocation] = useLocation();
  const [driver, setDriver] = useState("واثق دارمان");

  const handleCreate = async () => {
    const res = await fetch("/api/local_form/company_item_reduce", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer MASTER_TOKEN" },
      body: JSON.stringify({
        vihcle_info: {
          driver_name: driver,
          vehicle_number: "12339 اربيل",
          checkpoint_name_control: "سيطرة دارمان",
          company_name: "شركة اخوين الهاني",
          x_coordinate: "33.3152",
          y_coordinate: "44.3661"
        },
        items: { item1: { item_name: "ورق", production_capacity: "100", hash_id: "dcaadad1cfce437735b81ab025f776e5857e4855" } }
      })
    });
    const data = await res.json();
    if (data.is_found) setLocation(`/view/${data.data.doc_id}`);
  };

  return (
    <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'Cairo, sans-serif' }}>
      <h2 style={{ color: '#04408B' }}>بوابة المنتج المحلي</h2>
      <input
        style={{ padding: '10px', width: '300px', marginBottom: '20px', border: '1px solid #ccc', borderRadius: '8px' }}
        value={driver}
        onChange={(e) => setDriver(e.target.value)}
      />
      <br />
      <button
        onClick={handleCreate}
        style={{ padding: '15px 30px', backgroundColor: '#22c55e', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}
      >
        توليد الوثيقة المليارية ✅
      </button>
    </div>
  );
}