<script lang="ts">
	import { page } from "$app/stores";
	import { Button } from "svelte-ux";


    const makePdf = async () => {
    try {
        const response = await fetch(`/api/v1/devices/${$page.params.dev_eui}/reports`);

        if (!response.ok) {
            throw new Error('Failed to fetch the PDF');
        }

        // Convert response stream into a Blob
        const blob = await response.blob();

        // Create a URL for the Blob object
        const url = window.URL.createObjectURL(blob);

        // Create a link element
        const link = document.createElement('a');
        link.href = url;
        link.download = 'report.pdf'; // Set the name for the downloaded file

        // Append link to the body, click it to trigger download, and remove it afterward
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Optionally, revoke the URL after the download
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error downloading the PDF:', error);
    }
};

</script>



<h1>Reports</h1>


<Button on:click={() => makePdf()}>aaa</Button>