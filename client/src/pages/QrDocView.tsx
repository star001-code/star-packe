import { useState } from "react";
import { useLocation } from "wouter";

export default function LocalProduct() {
  const [, setLocation] = useLocation();
  const [driver, setDriver] = useState("واثق دارمان");

  const handleCreate = async () => {
    try {
      const res = await fetch("/api/local_form/company_item_reduce", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer MASTER_TOKEN" },
        body: JSON.stringify({
          vihcle_info: {
            driver_name: driver,
            vehicle_number: "12339 اربيل",
            checkpoint_name_control: "سيطرة دارمان",
            company_name: "شركة اخوين الهاني لانتاج الورق",
            x_coordinate: "33.3152",
            y_coordinate: "44.3661"
          },
          items: { item1: { item_name: "ورق", production_capacity: "100", hash_id: "dcaadad1cfce437735b81ab025f776e5857e4855" } }
        })
      });
      const data = await res.json();
      if (data.is_found) setLocation(`/view/${data.data.doc_id}`);
    } catch (e) {
      alert("فشل الاتصال بالسيرفر");
    }
  };

  return (
    <div className="p-8 max-w-lg mx-auto bg-white rounded-2xl shadow-xl mt-10" dir="rtl">
      <h2 className="text-2xl font-bold mb-6 text-center text-blue-900" style={{fontFamily: 'Cairo'}}>بوابة المنتج المحلي</h2>
      <div className="space-y-4">
        <input className="w-full p-3 border rounded-lg" value={driver} onChange={(e) => setDriver(e.target.value)} placeholder="اسم السائق" />
        <button onClick={handleCreate} className="w-full bg-green-600 text-white p-4 rounded-xl font-bold hover:bg-green-700 shadow-lg transition-all">توليد الوثيقة المليارية ✅</button>
      </div>
    </div>
  );
}