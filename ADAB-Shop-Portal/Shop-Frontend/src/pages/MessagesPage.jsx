import React from 'react';
import { Link } from 'react-router-dom';

export default function MessagesPage() {
  return (
<>
<section id="sec-messages" className="space-y-4">
      <div><h1 className="text-xl font-extrabold">Customer Messages</h1><p className="text-sm text-gray-500">Reply to buyer questions about orders and products</p></div>
      <div className="card p-3 flex flex-col sm:flex-row gap-2 flex-wrap">
        <input type="search" id="msgSearch" onInput={() => {}} placeholder="Search name or message..." className="flex-1 min-w-[160px] px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500" />
        <select id="msgFilter" onChange={() => {}} className="px-3 py-2 rounded-xl border border-gray-200 text-sm"><option value="all">All chats</option><option value="unread">Unread</option><option value="customer">Customers</option><option value="store">Other stores</option><option value="export">Export buyers</option></select>
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-2 lg:col-span-1 space-y-1 max-h-[480px] overflow-y-auto" id="msgList">
          <button onClick={() => {}} className="msg-item w-full text-left p-3 rounded-xl bg-green-50 border border-green-200" data-type="customer" data-unread="yes"><div className="font-bold text-sm">Pooja Sharma</div><div className="text-xs text-gray-500 truncate">Is the kurti available in blue?</div><div className="text-[10px] text-green-700 font-bold mt-1">2 min ago · Unread</div></button>
          <button onClick={() => {}} className="msg-item w-full text-left p-3 rounded-xl hover:bg-gray-50" data-type="customer" data-unread="no"><div className="font-bold text-sm">Vikram Patel</div><div className="text-xs text-gray-500 truncate">When will order #9008 arrive?</div><div className="text-[10px] text-gray-400 mt-1">1 hr ago</div></button>
          <button onClick={() => {}} className="msg-item w-full text-left p-3 rounded-xl hover:bg-gray-50" data-type="store" data-unread="no"><div className="font-bold text-sm">Vesu Grocery Mart</div><div className="text-xs text-gray-500 truncate">Can you do bulk discount on rice?</div><div className="text-[10px] text-gray-400 mt-1">Yesterday</div></button>
          <button onClick={() => {}} className="msg-item w-full text-left p-3 rounded-xl hover:bg-gray-50" data-type="export" data-unread="no"><div className="font-bold text-sm">NY Foods Inc (Export)</div><div className="text-xs text-gray-500 truncate">Need COA for basmati rice</div><div className="text-[10px] text-gray-400 mt-1">2 days ago</div></button>
        </div>
        <div className="card p-5 lg:col-span-2 flex flex-col min-h-[400px]">
          <div className="font-bold mb-1">Pooja Sharma · Order #9021</div>
          <div className="text-xs text-gray-500 mb-4">About: Balaji Silk Kurti</div>
          <div className="flex-1 space-y-3 text-sm overflow-y-auto">
            <div className="p-3 rounded-xl bg-gray-100 max-w-[80%]">Hi, is the kurti available in blue color size M?</div>
            <div className="p-3 rounded-xl bg-green-100 max-w-[80%] ml-auto">Yes! Blue M is in stock. We can deliver today.</div>
            <div className="p-3 rounded-xl bg-gray-100 max-w-[80%]">Great, please add it to my order.</div>
          </div>
          <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
            <input placeholder="Type your reply..." className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-green-500"  />
            <button onClick={() => {}} className="btn-primary !text-xs">Send</button>
          </div>
        </div>
      </div>
    </section>
</>
  );
}
