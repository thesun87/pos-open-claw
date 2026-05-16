-- CreateIndex
CREATE INDEX "idx_orders_payment_method_sold_at" ON "orders"("payment_method", "sold_at");
