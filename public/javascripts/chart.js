
const today = new Date().toISOString().split('T')[0];
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate());
const maxDate = tomorrow.toISOString().split('T')[0];

//document.getElementById("start-date").setAttribute("min", today)
document.getElementById("start-date").setAttribute("max", maxDate);
document.getElementById("end-date").setAttribute("min", today)
document.getElementById("end-date").setAttribute("max", maxDate);

// Ensure end date is greater than start date
var startDateField = document.getElementById("start-date");
var endDateField = document.getElementById("end-date");

startDateField.addEventListener("change", function () {
    endDateField.setAttribute("min", startDateField.value);
});

endDateField.addEventListener("change", function () {
    startDateField.setAttribute("max", endDateField.value);
});


const getSalesData = async() => {
const startDate = document.getElementById('start-date').value
const endDate =document.getElementById('end-date').value
 console.log(startDate, endDate) 



 Handlebars.registerHelper("for", function(from, to, incr, block) {
  var accum = '';
  for(var i = from; i < to; i += incr)
      accum += block.fn(i);
  return accum;
});



 // Define Handlebars template
const salesReportTemplate = `
<div class="col-xl-12">
  <!-- Account details card-->
  <div class="card mb-4">
    <div class="card-header" style="font-size: 1.25rem; font-weight: bold;">Sales Report</div>

    <div class="card-body ml-3 p-5">
      <table id="my-table" class="my-table table table-hover" style="width: 100%; border-top: 2px solid #ddd; border-spacing: 0; border-collapse: collapse;">
        <thead style="background-color: #f8f9fa; color: #333; text-align: left; font-weight: bold;">
          <tr>
            <th scope="col" style="padding: 12px 15px; border-bottom: 1px solid #ddd;">Date</th>
            <th scope="col" style="padding: 12px 15px; border-bottom: 1px solid #ddd;">Order id</th>
             <th scope="col" style="padding: 12px 15px; border-bottom: 1px solid #ddd;">Transaction id</th>
              <th scope="col" style="padding: 12px 15px; border-bottom: 1px solid #ddd;">Transaction date</th>
            <th scope="col" style="padding: 12px 15px; border-bottom: 1px solid #ddd;">Payment Method</th>
            <th scope="col" style="padding: 12px 15px; border-bottom: 1px solid #ddd;">Coupon</th>
            <th scope="col" style="padding: 12px 15px; border-bottom: 1px solid #ddd;">Coupon Used</th>
            <th scope="col" style="padding: 12px 15px; border-bottom: 1px solid #ddd;">Product Details</th>
            <th scope="col" style="padding: 12px 15px; border-bottom: 1px solid #ddd;">Total</th>
          </tr>
        </thead>
        <tbody style="background-color: #ffffff; color: #555;">
          {{#each data.orders}}
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 10px 15px; text-align: center;">{{this.date}}</td>
              <td style="padding: 10px 15px; text-align: center;">{{this.orderId}}</td>
              <td style="padding: 10px 15px; text-align: center;">{{this.transactionId}}</td>
              <td style="padding: 10px 15px; text-align: center;">{{this.transactionDate}}</td>
              <td style="padding: 10px 15px; text-align: center;">{{this.payMethod}}</td>
              <td style="padding: 10px 15px; text-align: center;">{{this.coupon}}</td>
              <td style="padding: 10px 15px; text-align: center;">{{this.couponUsed}}</td>
              <td style="padding: 10px 15px;">
                {{#each this.proName}}
                  <p style="margin: 5px 0;">Name: {{this.name}}</p>
                  <p style="margin: 5px 0;">Quantity: {{this.quantity}}</p>
                  <p style="margin: 5px 0;">Price: <span>₹</span>{{this.price}}</p>
                {{/each}}
              </td>
              <td style="padding: 10px 15px; text-align: center; font-weight: bold;"><span>₹</span>{{total}}</td>
            </tr>
          {{/each}}
        </tbody>
      </table>

      <div style="margin-top: 20px; font-size: 1.1rem;">
        <h5>Total Orders: <strong>{{data.salesCount}}</strong></h5>  <!-- Display sales count -->
        <h5>Total Revenue: ₹<strong>{{data.grandTotal}}</strong></h5> <!-- Display grand total -->
      </div>
    </div>
  </div>
</div>

`;





// Define function to render template with data
function renderSalesReport(data) {
  const compiledTemplate = Handlebars.compile(salesReportTemplate);
  const salesReportHTML = compiledTemplate({ data: data });
  document.getElementById('table').innerHTML = salesReportHTML

  $(document).ready( function () {
    $('#my-table').DataTable({
          dom: 'Bfrtip',      
          buttons: [
              'excelHtml5',
              'pdfHtml5'
      ]
    });
  });
}


 const response = await fetch(`/admin/get_sales?stDate=${startDate}&edDate=${endDate}`, {
    headers: { 'Content-Type': "application/json" },
 })

   const data = await response.json() 
   console.log(data)

   if (data) {
    console.log(data.orders);
    
    renderSalesReport(data);
  }
}
























