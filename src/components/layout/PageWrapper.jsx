export default function PageWrapper({ children }) {
  return (
    <div className="lg:ml-64 min-h-screen">
      <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
        {children}
      </div>
    </div>
  )
}
