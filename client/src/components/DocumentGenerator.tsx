import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, FileText, List } from "lucide-react";
import { Point } from "./PointInput";
import { useToast } from "@/hooks/use-toast";

interface DocumentGeneratorProps {
  multiRoutes: any[] | null;
  vehicleNames: string[];
  vehicleLoads: number[];
  vehicleCapacities: number[];
  xmlData?: string | null; // Originele XML data voor extra velden
}

export function DocumentGenerator({ 
  multiRoutes, 
  vehicleNames, 
  vehicleLoads, 
  vehicleCapacities,
  xmlData 
}: DocumentGeneratorProps) {
  const { toast } = useToast();

  const generateLoadingList = async () => {
    try {
      // Dynamically import jsPDF to avoid SSR issues
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      
      const doc = new jsPDF();
      let yPosition = 20;

      // Header
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('LAADLIJST', 105, yPosition, { align: 'center' });
      yPosition += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const today = new Date();
      doc.text(`Laaddatum: ${today.toLocaleDateString('nl-NL')}`, 14, yPosition);
      yPosition += 5;
      doc.text(`Ritnummer: ${today.toISOString().split('T')[0].replace(/-/g, '')}`, 14, yPosition);
      yPosition += 5;
      doc.text('Geladen door: _______________', 14, yPosition);
      yPosition += 10;

      if (!multiRoutes || multiRoutes.length === 0) {
        doc.text('Geen routes beschikbaar', 14, yPosition);
      } else {
        // Voor elk voertuig een sectie
        multiRoutes.forEach((routeData, vehicleIndex) => {
          const vehicleName = vehicleNames[vehicleIndex] || `Voertuig ${vehicleIndex + 1}`;
          const capacity = vehicleCapacities[vehicleIndex] || 0;
          const load = vehicleLoads[vehicleIndex] || 0;

          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text(`${vehicleName} - ${load.toFixed(1)} / ${capacity.toFixed(1)} LDM`, 14, yPosition);
          yPosition += 5;
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.text('Kenteken: _______________', 14, yPosition);
          yPosition += 7;

          // Tabel data voor dit voertuig
          const tableData: any[] = [];
          routeData.route.forEach((point: Point, index: number) => {
            if (point.id === 'start-end' && index > 0 && index < routeData.route.length - 1) {
              return; // Skip tussenliggende depot stops
            }

            const companyName = point.companyName || point.name || 'NA';
            const pickupName = point.pickupCompanyName || 'NA';
            const weightKg = point.weight ? Math.round(point.weight).toString() : 'NA';
            const volumeM3 = point.volume ? point.volume.toFixed(2) : 'NA';
            
            tableData.push([
              (index + 1).toString(),
              point.city || 'NA',
              companyName, // Afleveradres (CON - Name1)
              pickupName, // Ophaaladres (SHP - Name1)
              `${(point.loadMeters || 0).toFixed(1)} LDM`,
              `${volumeM3} M3`,
              `${weightKg} KG`,
              'NA', // Verpakking
            ]);
          });

          autoTable(doc, {
            startY: yPosition,
            head: [['#', 'Cooperatief', 'Afleveradres', 'Ophaaladres', 'LDM', 'M3', 'KG', 'Verpakking']],
            body: tableData,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [66, 66, 66], textColor: 255 },
            columnStyles: {
              0: { cellWidth: 10 },
              1: { cellWidth: 25 },
              2: { cellWidth: 45 },
              3: { cellWidth: 35 },
              4: { cellWidth: 15 },
              5: { cellWidth: 12 },
              6: { cellWidth: 15 },
              7: { cellWidth: 23 },
            },
            didDrawPage: (data: any) => {
              yPosition = data.cursor.y + 10;
            }
          });

          // Nieuwe pagina per voertuig (behalve laatste)
          if (vehicleIndex < multiRoutes.length - 1) {
            doc.addPage();
            yPosition = 20;
          }
        });
      }

      // Download
      doc.save(`laadlijst_${new Date().toISOString().split('T')[0]}.pdf`);
      toast({
        title: "Laadlijst gegenereerd",
        description: "De laadlijst is gedownload als PDF",
      });
    } catch (error) {
      console.error('Fout bij genereren laadlijst:', error);
      toast({
        title: "Fout bij genereren",
        description: "Kon laadlijst niet maken",
        variant: "destructive",
      });
    }
  };

  const generateRouteList = async () => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      
      const doc = new jsPDF();
      let yPosition = 20;

      // Header
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('ROUTELIJST', 105, yPosition, { align: 'center' });
      yPosition += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const today = new Date();
      doc.text(`Datum: ${today.toLocaleDateString('nl-NL')}`, 14, yPosition);
      yPosition += 5;
      doc.text(`Chauffeur: DMOURIK`, 14, yPosition); // Kan dynamisch worden
      yPosition += 5;
      doc.text(`Voertuig: ${vehicleNames[0] || 'NA'}`, 14, yPosition);
      yPosition += 10;

      if (!multiRoutes || multiRoutes.length === 0) {
        doc.text('Geen routes beschikbaar', 14, yPosition);
      } else {
        // Voor elk voertuig een sectie
        multiRoutes.forEach((routeData, vehicleIndex) => {
          if (vehicleIndex > 0) {
            doc.addPage();
            yPosition = 20;
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(`Voertuig: ${vehicleNames[vehicleIndex]}`, 14, yPosition);
            yPosition += 7;
          }

          // Tabel data
          const tableData: any[] = [];
          let previousTime = new Date();
          previousTime.setHours(8, 0, 0, 0); // Start om 08:00

          routeData.route.forEach((point: Point, index: number) => {
            if (point.id === 'start-end' && index > 0 && index < routeData.route.length - 1) {
              return;
            }

            // Geschatte aankomsttijd (elke stop +20 min)
            if (index > 0) {
              previousTime = new Date(previousTime.getTime() + 20 * 60000);
            }
            const timeStr = previousTime.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });

            const companyName = point.companyName || point.name || 'NA';
            const addressLine = `${companyName}\n${point.city || ''}`;
            const weightKg = point.weight ? Math.round(point.weight).toString() : 'NA';
            
            tableData.push([
              (index + 1).toString(),
              addressLine,
              point.timeWindow || 'NA',
              `${(point.loadMeters || 0).toFixed(1)} LDM`,
              `${weightKg} KG`,
              timeStr,
              '', // Handtekening kolom leeg
            ]);
          });

          autoTable(doc, {
            startY: yPosition,
            head: [['#', 'Adres', 'Tijdvenster', 'LDM', 'KG', 'Opgedracht', 'Handtekening']],
            body: tableData,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 3 },
            headStyles: { fillColor: [66, 66, 66], textColor: 255 },
            columnStyles: {
              0: { cellWidth: 10 },
              1: { cellWidth: 55 },
              2: { cellWidth: 30 },
              3: { cellWidth: 15 },
              4: { cellWidth: 15 },
              5: { cellWidth: 20 },
              6: { cellWidth: 45 },
            },
            didDrawPage: (data: any) => {
              yPosition = data.cursor.y;
            }
          });
        });
      }

      // Download
      doc.save(`routelijst_${new Date().toISOString().split('T')[0]}.pdf`);
      toast({
        title: "Routelijst gegenereerd",
        description: "De routelijst is gedownload als PDF",
      });
    } catch (error) {
      console.error('Fout bij genereren routelijst:', error);
      toast({
        title: "Fout bij genereren",
        description: "Kon routelijst niet maken",
        variant: "destructive",
      });
    }
  };

  if (!multiRoutes || multiRoutes.length === 0) {
    return null;
  }

  return (
    <Card className="p-6 mt-8">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium mb-2">Documenten Genereren</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Genereer laadlijst en routelijst voor deze rit. Ontbrekende gegevens worden aangegeven met "NA".
          </p>
        </div>
        
        <div className="flex gap-3 flex-wrap">
          <Button onClick={generateLoadingList} variant="outline">
            <List className="h-4 w-4 mr-2" />
            Download Laadlijst
          </Button>
          <Button onClick={generateRouteList} variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Download Routelijst
          </Button>
        </div>

        <div className="mt-4 p-3 bg-muted/50 rounded text-xs">
          <p className="font-medium mb-1">📋 Opmerking:</p>
          <p className="text-muted-foreground">
            Sommige velden (zoals transportbedrijf, afleververgunning, barcodes) worden nog niet uit het XML-bestand gelezen 
            en staan op "NA". Upload een XML-bestand en laat weten waar deze gegevens in staan, dan kan ik ze toevoegen.
          </p>
        </div>
      </div>
    </Card>
  );
}
