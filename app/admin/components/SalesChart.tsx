"use client";

import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

export default function SalesChart({ data }: { data: any[] }) {
    if (!data || data.length === 0) {
        return (
            <div className="flex h-64 w-full items-center justify-center rounded-xl bg-slate-50 border border-dashed border-slate-200">
                <p className="text-sm text-slate-400">Belum ada data penjualan</p>
            </div>
        );
    }

    return (
        <div className="h-80 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(value) => `Rp ${value.toLocaleString("id-ID")}`} />
                    <Tooltip
                        cursor={{ fill: '#f8fafc' }}
                        formatter={(value: any) => [`Rp ${Number(value).toLocaleString("id-ID")}`, ""]}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="omzet" fill="#3b82f6" name="Omzet" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    <Bar dataKey="profit" fill="#10b981" name="Profit Kotor" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
